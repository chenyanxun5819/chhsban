#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SMS 处理器 - 封装 SMS 系统的 HTTP 请求交互
"""

import requests
from requests.packages.urllib3.exceptions import InsecureRequestWarning
from bs4 import BeautifulSoup
import re
import time

# 导入全局常量配置
from .constants import LOGIN_URL, ACTIVITY_PAGE, ITEM_SETTING_PAGE, BASE_URL

# 禁用 SSL 警告
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)


class SMSHandler:
    """处理 SMS 系统交互"""

    # 从全局常量中使用URL配置（2026-06-20 改为内网地址）
    LOGIN_URL = LOGIN_URL
    ACTIVITY_PAGE = ACTIVITY_PAGE
    ITEM_SETTING_PAGE = ITEM_SETTING_PAGE

    def test_connection(self, username: str, password: str) -> bool:
        """测试连接 - 使用 requests 库（更稳定）"""
        try:
            print(f"📍 测试 SMS 连接...")
            print(f"   帐号: {username}")

            session = requests.Session()
            session.verify = False

            # 获取登入页面
            print(f"⏳ 获取登入页面...")
            response = session.get(self.LOGIN_URL, timeout=10)
            if response.status_code != 200:
                print(f"❌ 无法访问登入页面: {response.status_code}")
                return False
            print(f"✓ 登入页面已加载")

            # 提交登入表单
            print(f"📝 提交登入表单...")
            login_data = {
                'LoginForm[username]': username,
                'LoginForm[password]': password,
                'login-button': 'login'
            }

            response = session.post(self.LOGIN_URL, data=login_data, timeout=10, allow_redirects=True)

            # 检查登入结果
            if 'login' not in response.url.lower():
                print(f"✓ 登入成功！")
                print(f"   重定向到: {response.url}")
                return True
            else:
                print(f"❌ 登入失败 - 凭证错误或系统异常")
                print(f"   当前 URL: {response.url}")
                return False

        except Exception as e:
            print(f"❌ 连接测试异常: {e}")
            return False

    def upload_student_scores(self, username: str, password: str, scores_data: list,
                             date: str = None, activity_code: str = None,
                             session=None, max_retries: int = 3, retry_delay: int = 2,
                             log_callback=None) -> dict:
        """
        上传学生成绩（使用 requests 库背景执行，不打开浏览器）

        Args:
            username: SMS 系统用户名
            password: SMS 系统密码
            scores_data: 学生成绩数据列表
            date: 上传日期（格式: YYYY-MM-DD）
            activity_code: 活动代码（如: ACA CMO207）
            session: 现有的 requests Session（如果为 None，则创建新的）
            max_retries: 最大重试次数
            retry_delay: 重试前等待秒数
            log_callback: 日志回调函数，格式: log_callback(level, message)

        Returns:
            {
                'success': bool,
                'uploaded': int,  # 成功上传的条数
                'failed': int,    # 失败的条数
                'total': int,     # 总条数
                'message': str,   # 结果消息
                'errors': list    # 错误详情
            }
        """
        result = {
            'success': False,
            'uploaded': 0,
            'failed': 0,
            'total': len(scores_data),
            'message': '',
            'errors': []
        }

        def log(level: str, message: str):
            print(message)
            if log_callback:
                try:
                    log_callback(level, message)
                except Exception:
                    pass

        def _map_category_to_type(cat_value: str) -> str:
            """把 Excel 的 category 转换成 type_of_bonus 的值（校外学艺=1，特殊表现=2，其他预设为1）"""
            try:
                s = str(cat_value or '').strip()
                if '特殊' in s:
                    return '2'
                return '1'
            except Exception:
                return '1'

        def find_class_id(class_name_short, class_mapping_dict, short_mapping_dict):
            """根据班级名（可能是简写）查找完整班级 ID"""
            normalized_name = (class_name_short or '').strip()
            if normalized_name in short_mapping_dict:
                return short_mapping_dict[normalized_name]
            if normalized_name in class_mapping_dict:
                return class_mapping_dict[normalized_name]
            for full_name, class_id in class_mapping_dict.items():
                if full_name.endswith(f'({normalized_name})') or full_name.endswith(f'（{normalized_name}）'):
                    return class_id
            return None

        try:
            # 使用传入的 session，如果没有则创建新的
            use_session = session if session else requests.Session()
            if not session:
                use_session.verify = False

            # 重试循环
            for attempt in range(max_retries):
                log('info', f"\n📍 第 {attempt + 1} 次尝试...")

                # 如果没有使用传入的 session，则需要登入
                if not session:
                    try:
                        log('info', "⏳ 提交登入凭证...")
                        login_data = {
                            'LoginForm[username]': username,
                            'LoginForm[password]': password,
                            'login-button': 'login'
                        }
                        response = use_session.post(self.LOGIN_URL, data=login_data, timeout=10, allow_redirects=True)

                        if 'login' not in response.url.lower():
                            log('info', f"✓ 登入成功！当前 URL: {response.url}")
                        else:
                            raise Exception(f"登入失败 - 凭证错误或系统异常，当前 URL: {response.url}")
                    except Exception as e:
                        log('error', f"❌ 登入失败: {str(e)}")
                        result['errors'].append(f"第 {attempt + 1} 次登入失败: {str(e)}")

                        if attempt < max_retries - 1:
                            log('warning', f"⏳ {retry_delay} 秒后重试...")
                            time.sleep(retry_delay)
                            continue
                        else:
                            result['message'] = f"❌ 经过 {max_retries} 次尝试，登入仍然失败"
                            log('error', result['message'])
                            return result

                # 登入成功（或使用已有 session），开始上传
                log('info', f"✓ 准备上传 {len(scores_data)} 条成绩数据...")

                try:
                    # 第1步：取得新增表单页面，解析班级下拉与项目(item_id)下拉
                    resp_page = use_session.get(self.ACTIVITY_PAGE, timeout=15)
                    if 'login' in resp_page.url.lower():
                        raise Exception("Session 已失效 - 需要重新登入")

                    soup_page = BeautifulSoup(resp_page.text, 'html.parser')
                    
                    # 解析所有隐藏字段（包括CSRF token）
                    hidden_fields = {}
                    for hidden_input in soup_page.select('input[type="hidden"]'):
                        field_name = hidden_input.get('name')
                        field_value = hidden_input.get('value', '')
                        if field_name:
                            hidden_fields[field_name] = field_value
                            if 'csrf' in field_name.lower() or 'token' in field_name.lower():
                                log('debug', f"  🔑 找到安全令牌: {field_name}")
                    
                    # 解析提交按钮的值（通常是yt0或yt1）
                    submit_button = soup_page.select_one('button[type="submit"]') or soup_page.select_one('input[type="submit"]')
                    if submit_button:
                        button_name = submit_button.get('name', 'yt1')
                        button_value = submit_button.get('value') or submit_button.get_text(strip=True) or '储存'
                        hidden_fields[button_name] = button_value
                        log('debug', f"  🔘 提交按钮: {button_name} = {button_value}")
                    
                    if hidden_fields:
                        log('info', f"  🔒 解析到 {len(hidden_fields)} 个隐藏字段（包括安全令牌）")

                    class_name_to_id = {}
                    class_select = soup_page.select_one('select#class_id')
                    if class_select:
                        for option in class_select.select('option[value]:not([value=""])'):
                            class_name_to_id[option.get_text(strip=True)] = option.get('value')
                    log('info', f"  ✓ 取得 {len(class_name_to_id)} 个班级")

                    item_id = ""
                    item_select = soup_page.select_one('select#StudentPerformanceM_item_id')
                    if item_select:
                        for option in item_select.select('option[value]:not([value=""])'):
                            option_text = option.get_text(strip=True) or ""
                            if activity_code and activity_code in option_text:
                                item_id = option.get('value')
                                log('info', f"  ✓ 找到活动 '{activity_code}'，item_id: {item_id}")
                                break

                    if activity_code and not item_id:
                        result['message'] = f"❌ 查无此代号的活动，请先输入此活动项目资料！(代号: {activity_code})"
                        log('error', result['message'])
                        result['failed'] = result['total']
                        return result

                    # 检查此活动项目 + 日期是否已经有既有记录 -- 若有，之后要合并写入
                    # 同一笔记录，而不是另外新增一笔重复的活动记录
                    upload_date = date or '2026-01-01'
                    existing_post_data = {}
                    existing_internal_ids = set()
                    is_update_mode = False
                    update_hidden_fields = {}
                    
                    try:
                        check_params = {
                            'r': 'transaction/studentPerformance/update',
                            'date': upload_date,
                            'item_id': item_id,
                        }
                        resp_check = use_session.get(BASE_URL, params=check_params, timeout=15)
                        if resp_check.status_code == 200:
                            soup_check = BeautifulSoup(resp_check.text, 'html.parser')
                            perf_inputs = soup_check.select('input[name^="StudentPerformanceM[inputperformance]"]')
                            if perf_inputs:
                                is_update_mode = True
                                
                                # 从更新页面解析隐藏字段（包括CSRF token）
                                for hidden_input in soup_check.select('input[type="hidden"]'):
                                    field_name = hidden_input.get('name')
                                    field_value = hidden_input.get('value', '')
                                    if field_name:
                                        update_hidden_fields[field_name] = field_value
                                        if 'csrf' in field_name.lower() or 'token' in field_name.lower():
                                            log('debug', f"  🔑 更新模式CSRF令牌: {field_name}")
                                
                                # 解析更新页面的提交按钮
                                update_button = soup_check.select_one('button[type="submit"]') or soup_check.select_one('input[type="submit"]')
                                if update_button:
                                    button_name = update_button.get('name', 'yt1')
                                    button_value = update_button.get('value') or update_button.get_text(strip=True) or '储存'
                                    update_hidden_fields[button_name] = button_value
                                    log('debug', f"  🔘 更新模式提交按钮: {button_name} = {button_value}")
                                
                                log('info', f"  🔄 更新模式：从更新页面解析到 {len(update_hidden_fields)} 个隐藏字段")
                                
                                for inp in perf_inputs:
                                    name = inp.get('name')
                                    existing_post_data[name] = inp.get('value', '')
                                    m = re.search(r'\[inputperformance\]\[(\d+)\]\[', name or '')
                                    if m:
                                        existing_internal_ids.add(m.group(1))
                                for sel in soup_check.select('select[name^="StudentPerformanceM[inputperformance]"]'):
                                    chosen = sel.find('option', selected=True) or sel.find('option')
                                    existing_post_data[sel.get('name')] = chosen.get('value', '') if chosen else ''
                                for ta in soup_check.select('textarea[name^="StudentPerformanceM[inputperformance]"]'):
                                    existing_post_data[ta.get('name')] = ta.get_text()
                                for inp in soup_check.select('input[name^="StudentPerformanceM["]'):
                                    name = inp.get('name', '')
                                    if re.match(r'StudentPerformanceM\[\d+\]\[student_id\]', name):
                                        existing_post_data[name] = inp.get('value', '')
                                log('info', f"  ℹ 此活动在 {upload_date} 已有 {len(existing_internal_ids)} 位既有学生记录，将合并写入同一笔记录（不会另外新增）")
                    except Exception as e:
                        log('warning', f"  ⚠ 检查既有记录时发生问题，将以新增记录处理: {e}")

                    # 第2步：将班级简写（括号内代码）也纳入映射，方便匹配 Excel 里的简写班级名
                    short_code_to_id = {}
                    for full_name, mapped_class_id in class_name_to_id.items():
                        short_code_to_id.setdefault(full_name, mapped_class_id)
                        m = re.search(r'\(([A-Z0-9]+)\)', full_name)
                        if m:
                            short_code_to_id.setdefault(m.group(1), mapped_class_id)

                    # 第3步：找出本次上传所需要用到的班级 ID
                    required_class_ids = set()
                    missing_classes = []
                    for score_item in scores_data:
                        class_name = score_item.get('class', '')
                        class_id = find_class_id(class_name, class_name_to_id, short_code_to_id)
                        if class_id:
                            required_class_ids.add(class_id)
                        elif class_name not in missing_classes:
                            missing_classes.append(class_name)

                    if missing_classes:
                        log('warning', f"  ⚠ 未找到这些班级: {missing_classes}")

                    log('info', f"  所需班级 ID: {sorted(required_class_ids)}")

                    # 第4步：透过 AJAX 依班级抓取学生名单（取得系统内部的 internal_id）
                    def fetch_student_links(target_class_id: str, route: str):
                        ajax_params = {
                            'r': route,
                            'StudentPerformanceM[class_id]': target_class_id,
                            'StudentPerformanceM[item_id]': item_id,
                            'ajax': 'student-grid',
                            'date': date if date else '2026-01-01',
                            'item_id': item_id,
                        }
                        resp = use_session.get(BASE_URL, params=ajax_params, timeout=15)
                        soup = BeautifulSoup(resp.text, 'html.parser')
                        return resp, soup.select('a[data-student_id]')

                    fetch_route = 'transaction/studentPerformance/update'
                    probe_cache = None
                    required_class_ids_sorted = sorted(required_class_ids)

                    if required_class_ids_sorted:
                        probe_class_id = required_class_ids_sorted[0]
                        candidate_routes = [
                            'transaction/studentPerformance/update',
                            'transaction/studentPerformance/create',
                        ]
                        last_probe = None
                        for candidate_route in candidate_routes:
                            probe_resp, probe_links = fetch_student_links(probe_class_id, candidate_route)
                            log('info', f"  探测路由 {candidate_route}: HTTP {probe_resp.status_code}, students={len(probe_links)}")
                            last_probe = (candidate_route, probe_resp, probe_links)
                            if probe_resp.status_code == 200 and probe_links:
                                fetch_route = candidate_route
                                probe_cache = (probe_class_id, probe_resp, probe_links)
                                break

                        if probe_cache is None:
                            failed_route, failed_resp, _ = last_probe
                            result['message'] = f"❌ 学生名单获取失败，最后尝试 {failed_route} 返回 HTTP {failed_resp.status_code}"
                            log('error', result['message'])
                            return result

                    all_students_map = {}
                    for class_id in required_class_ids_sorted:
                        if probe_cache and class_id == probe_cache[0]:
                            resp, links = probe_cache[1], probe_cache[2]
                        else:
                            resp, links = fetch_student_links(class_id, fetch_route)

                        if resp.status_code >= 400:
                            log('warning', f"    班级 {class_id}: HTTP {resp.status_code}")
                            all_students_map[class_id] = {}
                            continue

                        all_students_map[class_id] = {}
                        for link in links:
                            student = {
                                'internal_id': link.get('data-student_id'),
                                'student_no': link.get('data-student_no'),
                                'class_id': class_id,
                            }
                            if student['internal_id'] and student['student_no']:
                                all_students_map[class_id][student['student_no']] = student
                        log('info', f"    班级 {class_id}: {len(all_students_map[class_id])} 位学生")

                    # 第5步：组装批量提交的表单数据（若为既有记录，先带入既有栏位以免覆盖遗失）
                    post_data = {
                        'StudentPerformanceM[year]': '2026',
                        'StudentPerformanceM[semester]': '1',
                        'StudentPerformanceM[date]': upload_date,
                        'StudentPerformanceM[item_id]': item_id,
                    }
                    # 添加从表单页面解析的隐藏字段（包括CSRF token）
                    # 如果是更新模式，使用更新页面的隐藏字段；否则使用新增页面的
                    if is_update_mode and update_hidden_fields:
                        post_data.update(update_hidden_fields)
                        log('debug', f"  使用更新模式的隐藏字段: {len(update_hidden_fields)} 个")
                    else:
                        post_data.update(hidden_fields)
                        log('debug', f"  使用新增模式的隐藏字段: {len(hidden_fields)} 个")
                    # 添加既有记录的字段
                    post_data.update(existing_post_data)

                    uploaded_count = 0
                    updated_existing = []
                    failed_students = []
                    first_class_id = None

                    for idx, score_item in enumerate(scores_data, 1):
                        student_id = score_item.get('student_id', '')
                        class_name = score_item.get('class', '')
                        award = score_item.get('remarks', '')
                        category = score_item.get('category', '')

                        msg = (f"  📤 匹配 [{idx}/{len(scores_data)}] "
                               f"{class_name} {student_id} {score_item.get('name', '')}")
                        log('info', msg)

                        found = False
                        for class_id, students_in_class in all_students_map.items():
                            if student_id in students_in_class:
                                sms_student = students_in_class[student_id]
                                internal_id = sms_student['internal_id']
                                is_existing = internal_id in existing_internal_ids

                                # 若该学生在此活动已有记录，这里会直接覆盖既有栏位（同一个 dict key），
                                # 而不是新增一笔重复记录
                                post_data[f'StudentPerformanceM[inputperformance][{internal_id}][class_id]'] = sms_student['class_id']
                                post_data[f'StudentPerformanceM[inputperformance][{internal_id}][type_of_bonus]'] = _map_category_to_type(category)
                                post_data[f'StudentPerformanceM[inputperformance][{internal_id}][mark]'] = '0.00'
                                post_data[f'StudentPerformanceM[inputperformance][{internal_id}][remark]'] = str(award)

                                if first_class_id is None:
                                    first_class_id = sms_student['class_id']

                                if is_existing:
                                    log('success', "      ✓ 已存在记录，覆盖更新备注/分数")
                                    updated_existing.append(f"{class_name} {student_id}")
                                else:
                                    log('success', "      ✓ 新增记录")
                                uploaded_count += 1
                                found = True
                                break

                        if not found:
                            log('warning', "      ⚠ 未找到此学生")
                            failed_students.append(f"{class_name} {student_id}")

                    if first_class_id:
                        post_data['filterS'] = 'class'
                        post_data['class_id'] = first_class_id
                        post_data['club_id'] = '53'

                    post_data['StudentM[student_no]'] = ''
                    post_data['StudentM[student_name]'] = ''
                    post_data['StudentM[student_cname]'] = ''
                    post_data['StudentM[class_name]'] = ''
                    # yt1（提交按钮）的值已从表单解析并包含在hidden_fields中，不再手动设置为空
                    # 如果表单中没有找到提交按钮，才设置默认值
                    if 'yt1' not in post_data and 'yt0' not in post_data:
                        post_data['yt1'] = '储存'

                    result['failed'] = len(failed_students)
                    result['errors'].extend(failed_students)

                    if uploaded_count == 0:
                        result['uploaded'] = 0
                        result['message'] = f"❌ 未找到任何匹配的学生 ({len(failed_students)}/{result['total']})"
                        log('error', result['message'])
                        return result

                    # 第6步：一次性提交整批成绩（若既有记录，提交到 update 路由合并写入，避免产生重复的活动记录）
                    log('info', f"\n📮 提交 {uploaded_count} 位学生的成绩...")
                    log('debug', f"POST数据字段数量: {len(post_data)}")
                    log('debug', f"模式: {'更新' if is_update_mode else '新增'}")
                    
                    # 输出POST数据的关键字段用于调试
                    log('debug', "POST数据关键字段:")
                    for key in sorted(post_data.keys()):
                        if 'csrf' in key.lower() or 'token' in key.lower() or key.startswith('yt'):
                            log('debug', f"  {key} = {post_data[key][:50] if len(str(post_data[key])) > 50 else post_data[key]}")
                    
                    try:
                        if is_update_mode:
                            submit_params = {
                                'r': 'transaction/studentPerformance/update',
                                'date': upload_date,
                                'item_id': item_id,
                            }
                            submit_url = f"{BASE_URL}?r=transaction/studentPerformance/update&date={upload_date}&item_id={item_id}"
                            log('debug', f"提交URL: {submit_url}")
                            upload_response = use_session.post(BASE_URL, params=submit_params, data=post_data, timeout=30)
                        else:
                            log('debug', f"提交URL: {self.ACTIVITY_PAGE}")
                            upload_response = use_session.post(self.ACTIVITY_PAGE, data=post_data, timeout=30)

                        log('info', f"📡 响应状态: HTTP {upload_response.status_code}")
                        log('debug', f"响应URL: {upload_response.url}")
                        log('debug', f"响应内容长度: {len(upload_response.text)} 字符")
                        
                        # 接受所有2xx和3xx响应（包括302重定向），只拒绝4xx和5xx错误
                        if upload_response.status_code >= 400:
                            raise Exception(f"HTTP {upload_response.status_code}")

                        if 'login' in upload_response.url.lower():
                            raise Exception("连接失败 - Session 可能已失效")
                        
                        # 解析响应HTML查找错误消息
                        response_soup = BeautifulSoup(upload_response.text, 'html.parser')
                        
                        # 查找常见的错误提示元素
                        error_divs = response_soup.select('.errorMessage, .error-summary, .alert-danger, div.error')
                        if error_divs:
                            error_messages = [div.get_text(strip=True) for div in error_divs]
                            log('error', f"❌ SMS系统返回错误: {'; '.join(error_messages)}")
                            raise Exception(f"SMS验证错误: {'; '.join(error_messages)}")
                        
                        # 检查是否返回了表单页面（而不是成功页面）
                        # 如果响应中仍包含表单元素，说明提交失败
                        form_exists = response_soup.select_one('form#student-performance-m-form')
                        if not form_exists:
                            # 尝试其他可能的表单选择器
                            form_exists = response_soup.select_one('form') and len(upload_response.text) > 100000
                        
                        if form_exists:
                            log('warning', f"⚠️ 响应包含表单，可能提交失败（响应长度: {len(upload_response.text)}）")
                            
                            # 查找表单中的字段错误
                            field_errors = response_soup.select('.field-error, .help-block.error, span.error, .error-message')
                            if field_errors:
                                field_error_msgs = [err.get_text(strip=True) for err in field_errors if err.get_text(strip=True)]
                                if field_error_msgs:
                                    log('error', f"❌ 表单验证失败: {'; '.join(field_error_msgs)}")
                                    raise Exception(f"表单验证失败: {'; '.join(field_error_msgs)}")
                            
                            # 检查是否有JavaScript错误或消息
                            scripts = response_soup.select('script')
                            for script in scripts:
                                script_text = script.get_text()
                                if 'error' in script_text.lower() or 'alert' in script_text.lower():
                                    # 尝试提取错误消息
                                    import re
                                    alert_matches = re.findall(r'alert\([\'"](.+?)[\'"]\)', script_text)
                                    if alert_matches:
                                        log('error', f"❌ JavaScript错误: {'; '.join(alert_matches)}")
                                        raise Exception(f"表单提交错误: {'; '.join(alert_matches)}")
                            
                            # 如果没有找到具体错误，但确实返回了表单
                            log('error', "❌ POST请求被拒绝，SMS返回了原表单页面")
                            log('error', "可能原因：1) CSRF token失效 2) 缺少必需字段 3) 数据验证失败")
                            
                            # 输出表单的所有input字段名以便调试
                            all_inputs = response_soup.select('form input[name]')
                            required_fields = [inp.get('name') for inp in all_inputs if inp.get('required') or 'required' in (inp.get('class') or [])]
                            if required_fields:
                                log('error', f"表单必需字段: {', '.join(required_fields[:10])}")
                            
                            # 保存响应HTML用于调试
                            try:
                                import os
                                from pathlib import Path
                                debug_dir = Path.home() / '.sms_app' / 'debug'
                                debug_dir.mkdir(parents=True, exist_ok=True)
                                debug_file = debug_dir / f'failed_response_{upload_date.replace("/", "")}.html'
                                debug_file.write_text(upload_response.text, encoding='utf-8')
                                log('debug', f"响应HTML已保存到: {debug_file}")
                            except Exception as e:
                                log('warning', f"无法保存调试HTML: {e}")
                            
                            raise Exception("POST请求被拒绝，请检查表单数据完整性和CSRF token")
                        
                        # 检查响应内容是否包含错误关键字（但不是HTML标签中的）
                        response_text = upload_response.text.lower()
                        if 'error' in response_text or '错误' in response_text or '失败' in response_text:
                            # 尝试提取可读的错误信息
                            error_snippet = upload_response.text[:1000] if len(upload_response.text) < 1000 else upload_response.text[:1000] + '...'
                            log('warning', f"⚠️ 响应中可能包含错误关键字，但未找到明确错误元素")

                        result['uploaded'] = uploaded_count
                        result['success'] = (result['failed'] == 0)
                        if result['failed'] == 0:
                            result['message'] = f"✅ 上传完成: {uploaded_count} 成功, 0 失败"
                        else:
                            result['message'] = f"⚠️ 部分成功: {uploaded_count} 成功, {result['failed']} 未找到"
                        if updated_existing:
                            result['message'] += f"（其中 {len(updated_existing)} 位是覆盖既有记录）"
                        log('info', f"\n{result['message']}")
                        return result

                    except requests.exceptions.ConnectionError:
                        raise Exception("连接失败 - Session 可能已失效")

                except Exception as e:
                    error_msg = str(e).lower()
                    log('error', f"❌ 上传过程异常: {e}")
                    result['errors'].append(f"上传异常: {str(e)}")

                    if ('session' in error_msg or 'connection' in error_msg) and attempt < max_retries - 1:
                        log('warning', "⚠️  检测到 Session 相关错误，准备重新尝试...")
                        # 强制重新创建 session 以解决 cookies 失效问题
                        use_session = requests.Session()
                        use_session.verify = False
                        # 清空 session 参数，强制在下一次迭代重新登入
                        session = None
                        log('info', f"⏳ {retry_delay} 秒后重试...")
                        time.sleep(retry_delay)
                        continue
                    else:
                        result['message'] = result['message'] or f"❌ 上传失败: {str(e)}"
                        return result

        except Exception as e:
            result['message'] = f"❌ 上传异常: {str(e)}"
            result['errors'].append(str(e))
            print(result['message'])
            import traceback
            traceback.print_exc()

        return result
