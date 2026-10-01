#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
项目名称相似度比对 - 新增项目前找出可能重复的旧项目
"""

import re
import unicodedata
from difflib import SequenceMatcher

# 相似度达到此值即列为「相似项目」（输入名称时的提示）
SIMILARITY_THRESHOLD = 0.8
# 相似度达到此值，添加前要输入者再确认一次
CONFIRM_THRESHOLD = 0.85
# 去掉数字后相似度达到此值，且数字不同，视为同一活动的不同年度/届
SAME_EVENT_THRESHOLD = 0.92
# 较短名称被完整包含时的加权（如只输入了名称的一部分）
COVERAGE_WEIGHT = 0.4
# 名称短于此长度不计算包含度，避免「篮球比赛」这类泛称到处命中
MIN_COVERAGE_LENGTH = 5

NOTE_SAME = '名称相同'
NOTE_OTHER_EDITION = '年份/届数不同'

# 名称开头的类别前缀（如 "比赛-"、"CAMP - "），比对时忽略
_CATEGORY_PREFIX = re.compile(
    r'^\s*(比赛|表演|服务|交流|额外活动|活动|营队|考试|讲座|培训|camp)\s*[-－–—:：]+\s*',
    re.IGNORECASE
)
# 年份、届数等数字
_NUMBERS = re.compile(r'第[一二三四五六七八九十廿卅百零〇两]+[届屆回次]|\d+')
_YEAR = re.compile(r'(?<!\d)20\d{2}(?!\d)')
_NON_WORD = re.compile(r'[\W_]+')


def _clean(name: str) -> str:
    """全半角统一、不分大小写、去类别前缀"""
    text = unicodedata.normalize('NFKC', str(name or '')).lower()
    return _CATEGORY_PREFIX.sub('', text)


def normalize_name(name: str) -> str:
    """名称正规化：全半角统一、去类别前缀、去空格与标点、不分大小写"""
    return _NON_WORD.sub('', _clean(name))


def _split_numbers(name: str) -> tuple:
    """拆成（去掉数字的名称, 排序后的数字列表, 年份集合）"""
    text = _clean(name)
    numbers = sorted(_NUMBERS.findall(text))
    return _NON_WORD.sub('', _NUMBERS.sub('', text)), numbers, set(_YEAR.findall(text))


def _is_other_edition(text, numbers, years, query_text, query_numbers, query_years) -> bool:
    """是否为同一活动的不同年度/届（而不是重复新增）"""
    # 两边都写了年份而且年份不同
    if years and query_years and years != query_years:
        return True
    # 去掉数字后几乎一样，只是数字不同
    if not (numbers and query_numbers and numbers != query_numbers and text and query_text):
        return False
    return SequenceMatcher(None, text, query_text, autojunk=False).ratio() >= SAME_EVENT_THRESHOLD


class ProjectNameIndex:
    """预先正规化所有旧项目名称，供重复查询"""

    def __init__(self, projects: list):
        self.entries = []
        for project in projects or []:
            name = project.get('项目名称', '')
            normalized = normalize_name(name)
            if normalized:
                self.entries.append((project, normalized) + _split_numbers(name))

    def find_similar(self, name: str, threshold: float = SIMILARITY_THRESHOLD, limit: int = 5) -> list:
        """
        找出与 name 相似的旧项目

        Returns:
            list: [{'project': {...}, 'score': 0.0~1.0, 'note': '...'}, ...]，相似度高的在前
        """
        query = normalize_name(name)
        # 太短的名称比不出意义
        if len(query) < 2:
            return []

        query_text, query_numbers, query_years = _split_numbers(name)
        # 包含度最多补 COVERAGE_WEIGHT，原始相似度低于此值就不可能达标
        min_ratio = (threshold - COVERAGE_WEIGHT) / (1 - COVERAGE_WEIGHT)

        matcher = SequenceMatcher(autojunk=False)
        matcher.set_seq2(query)

        results = []
        for project, normalized, text, numbers, years in self.entries:
            if normalized == query:
                results.append({'project': project, 'score': 1.0, 'note': NOTE_SAME})
                continue

            matcher.set_seq1(normalized)
            if matcher.real_quick_ratio() < min_ratio or matcher.quick_ratio() < min_ratio:
                continue

            matched = sum(block.size for block in matcher.get_matching_blocks())
            score = 2.0 * matched / (len(normalized) + len(query))
            shorter = min(len(normalized), len(query))
            if shorter >= MIN_COVERAGE_LENGTH:
                coverage = matched / shorter
                score = max(score, (1 - COVERAGE_WEIGHT) * score + COVERAGE_WEIGHT * coverage)
            if score < threshold:
                continue

            note = ''
            if _is_other_edition(text, numbers, years, query_text, query_numbers, query_years):
                note = NOTE_OTHER_EDITION
            results.append({'project': project, 'score': score, 'note': note})

        # 真正可能重复的排在「年份/届数不同」之前
        results.sort(key=lambda r: (r['note'] != NOTE_OTHER_EDITION, r['score']), reverse=True)
        return results[:limit]


def likely_duplicates(matches: list) -> list:
    """从 find_similar 的结果中剔除「年份/届数不同」的项目（同一活动的不同年度，不算重复）"""
    return [m for m in matches if m['note'] != NOTE_OTHER_EDITION]
