<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">


<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="zh">

<head>

  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />

  <meta name="language" content="en" />

  <link rel="stylesheet" type="text/css" href="/sms/css/modify.css" />

  <link rel="icon" href="/sms/images/data/logo/thumbs/thumb-logo-1541758561.png" type="image/x-icon">

  <link rel="stylesheet" type="text/css" href="/sms/assets/45e0cf9f/select2/select2.css" />
<link rel="stylesheet" type="text/css" href="/sms/assets/45e0cf9f/css/bootstrap-box.css" />
<script type="text/javascript" src="/sms/assets/9d7d51e5/jquery.min.js"></script>
<script type="text/javascript" src="/sms/assets/45e0cf9f/select2/select2.min.js"></script>
<script type="text/javascript" src="/sms/assets/9d7d51e5/jquery.ba-bbq.min.js"></script>
<script type="text/javascript" src="js/accounting.js"></script>
<script type="text/javascript" src="/sms/assets/7e7b6bf8/jquery.maskMoney.js"></script>
<title>CHUNG HUA HIGH SCHOOL - 输入校外实习和特殊绩效分数</title>

  
  <!--<link rel="stylesheet" type="text/css" href="/theme/css/glyphicons.css"/>

  <link rel="stylesheet" type="text/css" href="/theme/scripts/plugins/forms/pixelmatrix-uniform/css/uniform.default.css"/>-->

  <!-- <link rel="stylesheet" type="text/css" href="/theme/css/style-light.css"/> -->

  <!--<link rel="stylesheet" type="text/css" href="/theme/css/style-light-new.css"/> -->



  <!-- Glyphicons Font Icons -->

  <link href="/sms/themes/ergo/common/theme/css/glyphicons.css" rel="stylesheet" />



  <!-- Uniform Pretty Checkboxes -->

  <!--<link href="<?/*= Yii::app()->theme->baseUrl; */?>/common/theme/scripts/plugins/forms/pixelmatrix-uniform/css/uniform.default.css" rel="stylesheet" />-->



  <!-- DataTables Plugin -->

  <link href="/sms/themes/ergo/common/theme/scripts/plugins/tables/DataTables/media/css/DT_bootstrap.css" rel="stylesheet" />



  <!-- Main Theme Stylesheet :: CSS -->

  <link href="/sms/themes/ergo/common/theme/css/style-light.css?1369753444" rel="stylesheet" />



  <style>

  .bootstrap-widget-header .btn-group {

    margin-right: 10px;

  }

  .list-view, .grid-view {

    padding-top: 0px;

  }

  .collapse{

    margin-bottom: 5px;

  }

  .collapse .accordion-group{

    border:none;

  }

  .collapse .accordion-heading {



    position: relative;



    /*height: 40px;*/

    /*line-height: 40px;*/



    background: #E9E9E9;

    background: -moz-linear-gradient(top, #FAFAFA 0%, #E9E9E9 100%); /* FF3.6+ */

    background: -webkit-gradient(linear, left top, left bottom, color-stop(0%, #FAFAFA), color-stop(100%, #E9E9E9)); /* Chrome,Safari4+ */

    background: -webkit-linear-gradient(top, #FAFAFA 0%, #E9E9E9 100%); /* Chrome10+,Safari5.1+ */

    background: -o-linear-gradient(top, #FAFAFA 0%, #E9E9E9 100%); /* Opera11.10+ */

    background: -ms-linear-gradient(top, #FAFAFA 0%, #E9E9E9 100%); /* IE10+ */

    background: linear-gradient(top, #FAFAFA 0%, #E9E9E9 100%); /* W3C */

    filter: progid:DXImageTransform.Microsoft.gradient(startColorstr = '#FAFAFA', endColorstr = '#E9E9E9');

    -ms-filter: "progid:DXImageTransform.Microsoft.gradient(startColorstr='#FAFAFA', endColorstr='#E9E9E9')";



    border: 1px solid #D5D5D5;



    -webkit-border-top-left-radius: 4px;

    -webkit-border-top-right-radius: 4px;

    -moz-border-radius-topleft: 4px;

    -moz-border-radius-topright: 4px;

    border-top-left-radius: 4px;

    border-top-right-radius: 4px;



    box-shadow: 0px;



    -webkit-background-clip: padding-box;

  }



  .collapse .accordion-body {

    background: #FFF;

    border: 1px solid #D5D5D5;

    -moz-border-radius: 5px;

    -webkit-border-radius: 5px;

    border-radius: 5px;

  }



  .collapse .accordion-body {

    border-top: none;

    -webkit-border-top-left-radius: 0;

    -webkit-border-top-right-radius: 0;

    -moz-border-radius-topleft: 0;

    -moz-border-radius-topright: 0;

    border-top-left-radius: 0;

    border-top-right-radius: 0;

  }

  .collapse .accordion-heading a, .collapse .accordion-heading a:hover{

    text-decoration: none;

    color: #555;

    font-weight: bold;

  }

  </style>



  <script>

  (function () {

    var currentTime = new Date("June 29 2026 12:07:56 PM");

    setInterval(function ()

    {

      currentTime.setSeconds(currentTime.getSeconds() + 1)

      var currentHours = currentTime.getHours();

      var currentMinutes = currentTime.getMinutes();

      var currentSeconds = currentTime.getSeconds();

      // Pad the minutes and seconds with leading zeros, if required

      currentMinutes = (currentMinutes < 10 ? "0" : "") + currentMinutes;

      currentSeconds = (currentSeconds < 10 ? "0" : "") + currentSeconds;

      // Choose either "AM" or "PM" as appropriate

      var timeOfDay = (currentHours < 12) ? "AM" : "PM";

      // Convert the hours component to 12-hour format if needed

      currentHours = (currentHours > 12) ? currentHours - 12 : currentHours;

      // Convert an hours component of "0" to "12"

      currentHours = (currentHours == 0) ? 12 : currentHours;

      // Compose the string for display

      var currentTimeString = currentHours + ":" + currentMinutes + ":" + currentSeconds + " " + timeOfDay;



      $("#timer").html(currentTimeString);

    }, 1000);

  })();



  var alert = function (message) {

    bootbox.alert(message);

  };



  var dfd = new $.Deferred();



  var formatNumber = function (total) {

    return accounting.formatNumber(total, 2, ',', '.');

  };

  var unFormatNumber = function (value) {

    return accounting.unformat(value, '.');

  };



  </script>

</head>

<body style="padding-left: 0px !important; padding-right: 0px !important;">

  
  <!-- <div class="container"> -->

  
    <!-- breadcrumbs -->

    
    
    
    <!-- </div> -->

    <div id="myModal" class="modal hide fade"><div class="modal-header">
    <a class="close" data-dismiss="modal">&times;</a>
    <h4>Header</h4>
</div>

<div class="modal-body" id="body-modal">

</div>

<div class="modal-footer">
    <button onclick="submitForm(this);return false;" class="btn btn-primary" id="yw7" name="yt3" type="button">保存</button><button data-dismiss="modal" class="btn" id="yw8" name="yt4" type="button">关闭</button></div>

</div>
<script type="text/javascript">
    var loadHtmlAjax = function(obj) {
        var url = $(obj).data('url');
        var title = $(obj).data("title");
        $("#myModal .modal-header h4").html(title);
        var idSelect = $(obj).parents(".input-append").find("select").attr("id");
        $("#myModal").data("select", idSelect);
        $.ajax({
            url: url,
            dataType: 'json',
            success: function(result) {
                if (result.contents) {
                    $("#body-modal").html(result.contents);
                }
            }
        });
    };
    var submitForm = function(obj) {
        var form = $(obj).parents("#myModal").find("form");
        $.ajax({
            url: form.attr('action'),
            type: 'post',
            dataType: 'json',
            data: form.serialize(),
            beforeSend: function() {
                $(obj).button().attr("disabled", true);
            },
            success: function(result) {
                if (result.success) {
                    $("#myModal").modal('hide');
                    if (result.hasOwnProperty('reload') && result.reload === true) {
                        location.reload();
                    } else {
                        reloadParent();
                    }
                } else {
                    $("#body-modal").html(result.contents);
                }

            }
        }).always(function() {
            $(obj).button().attr("disabled", false);
        });
    };

    var reloadParent = function() {
        var idSelect = "#" + $("#myModal").data('select');
        $.ajax({
            url: window.location.href,
            success: function(result) {
                data = $(result).find(idSelect);
                value = $("form " + idSelect).val()
                if ($("form " + idSelect).replaceWith(data)) {
                    $("form " + idSelect).val(value);
                }
            }
        });
    };

    var loadAnnouncement = function(obj) {
        var url = $(obj).data('url');
        var title = $(obj).data("title");

        var ann_id = $(obj).attr('ann-id');
        var isread = $(obj).attr('isread');
        $(".modal-footer .btn-primary").hide();
        $("#myModal .modal-header h4").html(title);
        $.ajax({
            url: url,
            dataType: 'json',
            data: {id : ann_id},
            success: function(result) {
                if (result.success && result.contents) {
                    $("#body-modal").html(result.contents);

                    if(isread == 0){
                        markRead(ann_id);
                        reloadGrid();
                    }
                }
            }
        });
    };

</script>
    <div class="container-fluid fluid menu-left">



      <!-- Top navbar (note: add class "navbar-hidden" to close the navbar by default) -->

      <div class="navbar main hidden-print">



        <!-- Wrapper -->

        <div class="wrapper">





          <!-- Menu Toggle Button -->

          <button type="button" class="btn btn-navbar">

            <span class="icon-bar"></span> <span class="icon-bar"></span> <span class="icon-bar"></span>

          </button>

          <!-- // Menu Toggle Button END -->



          <ul class="topnav pull-left tn1">


                          <li class="dropdown dd-1 dd-2">

                <a href="/sms/index.php?r=info/announcement" class="glyphicons message_new"><i></i> 告示 <span class="count">0</span></a>

                <!-- <ul class="dropdown-menu pull-left">

                <li><a href="#" class="glyphicons envelope"><i></i> New Email</a></li>

                <li><a href="#" class="glyphicons chat"><i></i> 5 Messages</a></li>

                <li><a href="#" class="glyphicons conversation"><i></i> 1 New Reply</a></li>

              </ul> -->

            </li>


                  </ul>

        <!-- Top Menu Right -->

        <ul class="topnav pull-right">

          <!-- Language menu -->

          <li class="dropdown dd-1 dd-flags" id="lang_nav">
                                    
            <!--<a href="#" data-toggle="dropdown"><img src="images/flags/<?/*= Yii::app()->language */?>.png" alt="en" /></a>-->

            <a href="#" data-toggle="dropdown">中文</a>

            <ul class="dropdown-menu pull-right">

              
                <li><a href="/sms/index.php?r=site/changeLanguage&id=zh">

                  <!--<img src="images/flags/<?/*= $key */?>.png" alt="English">--> 中文</a></li>

                
                <li><a href="/sms/index.php?r=site/changeLanguage&id=en">

                  <!--<img src="images/flags/<?/*= $key */?>.png" alt="English">--> English</a></li>

                
              </ul>

            </li>

            <!-- // Language menu END -->
            <!-- Profile / Logout menu -->

            <li class="account dropdown dd-1">

              <a data-toggle="dropdown" href="#" class="glyphicons logout user"><span class="hidden-phone">Schhs334 </span><i></i></a>

              <ul class="dropdown-menu pull-right">
                                  <li><a href="#" class="glyphicons calendar" data-url="/sms/index.php?r=configuration/startSemester/history" data-toggle="modal" data-title="转换学期" data-target="#myModal" onclick="loadPeriod(this);">转换学期<i></i></a></li>

                  <li><a href="/sms/index.php?r=site/changePassword" class="glyphicons cogwheel">更改密码<i></i></a></li>
                                  <li>

                  <li><a href="/sms/index.php?r=site/logout" class="glyphicons logout lock">登出<i></i></a></li>

                </ul>

              </li>

              <!-- // Profile / Logout menu END -->



            </ul>

            <!-- // Top Menu Right END -->





            <div class="clearfix"></div>

          </div>

          <!-- // Wrapper END -->



          <span class="toggle-navbar"></span>

        </div>

        <!-- Top navbar END -->



        <!-- Sidebar menu & content wrapper -->

        <div id="wrapper">



          <!-- Sidebar Menu -->

          <div id="menu" class="hidden-phone hidden-print">



            <!-- Brand -->

            <center>

              <a href="/sms/index.php?r=site/index" class="appbrand"><img src="/sms/images/data/logo/thumbs/thumb-logo-1541758561.png" width="40px" /> <span> CHUNG HUA HIGH SCHOOL</span></a>

            </center>



            <!-- Scrollable menu wrapper with Maximum height -->

            <!--            <div class="slim-scroll" data-scroll-height="800px"> -->
            <div class="slim-scroll" data-scroll-height="100vh">



              <!-- Sidebar Profile -->

              <!-- <span class="profile">

              <p></p>

              <a class="img" href="my_account.html?lang=en&amp;layout_type=fluid&amp;menu_position=menu-left&amp;style=style-light"><img src="/sms/themes/ergo/common/theme/images/avatar-style-light.jpg" alt="Avatar" /></a>

              <span>

              <ul>

              <li><a href="#" class="glyphicons user"><i></i>Schhs334</a></li>

              <li><a href="/sms/index.php?r=site/changePassword" class="glyphicons keys"><i></i>Password</a></li>

              <li><a href="/sms/index.php?r=site/logout" class="glyphicons eject"><i></i>Logout</a></li>

            </ul>

          </span>

        </span> -->

        <!-- // Sidebar Profile END -->



        <!-- Regular Size Menu -->

        <ul class="menu-0">



          <!-- Blank page template menu example -->

          <!-- Menu Regular Item (add class active to LI for an active menu item) -->



          
            <li class="glyphicons menu_menu"><a href="/sms/index.php?r=site/index"><i></i><span>校务系统</span></a></li>
          
            <li class="hasSubmenu menu1 glyphicons menu_menu"><a data-toggle="collapse" href="#submenu-1" title="训育处"><i></i><span>训育处</span></a>
          
            <span class="karetP"></span>
                                <ul class="collapse" id="submenu-1">
          
            <li class="hasSubmenu menu2">
                                            <a data-toggle="collapse" href="#submenu-1-1"><span>校外学艺及特殊表现</span></a>
                                            <span class="karet"></span>
                                            <ul class="collapse" id="submenu-1-1">
          
            <li><a href="/sms/index.php?r=transaction/itemSetting/index" ><span>项目设定</span></a></li>
          
            <li><a href="/sms/index.php?r=transaction/studentPerformance/index" ><span>输入额外分数</span></a></li>
          
            </ul>
                                        </li>
          
            </ul>
          
            </li>
          
            <li class="hasSubmenu menu1 glyphicons menu_menu"><a data-toggle="collapse" href="#submenu-2" title="图书馆"><i></i><span>图书馆</span></a>
          
            <span class="karetP"></span>
                                <ul class="collapse" id="submenu-2">
          
            <li><a href="/sms/index.php?r=library/hyRead/index" ><span> HyRead eLibrary</span></a></li>
          
            <li><a href="/sms/index.php?r=library/bookInfo/index" ><span>书籍资料</span></a></li>
          
            </ul>
          
            </li>
          


        </ul>

        <div class="clearfix"></div>

        <!-- // Regular Size Menu END -->



        <!-- <ul class="menu-1">

        <li class="hasSubmenu active">

        <a class="glyphicons wifi_alt" href="#menu-recent-stats" data-toggle="collapse"><i></i><span>Recent stats</span></a>

        <ul class="collapse in" id="menu-recent-stats">

        <li><a class="glyphicons envelope" href="#"><i></i><span>5 New Emails</span></a></li>

        <li><a class="glyphicons chat" href="#"><i></i><span>New Message on 19 Jan</span></a></li>

        <li><a class="glyphicons user_add" href="#"><i></i><span>10 Users Subscribed</span></a></li>

        <li><a class="glyphicons cart_in" href="#"><i></i><span>2 Orders worth of &dollar;239</span></a></li>

        <li><a class="glyphicons single circle_plus" href="#"><i></i><span>View all</span></a></li>

      </ul>

    </li>

  </ul>

  <div class="clearfix"></div> -->

  <div class="separator bottom"></div>









</div>

<!-- // Scrollable Menu wrapper with Maximum Height END -->



</div>

<!-- // Sidebar Menu END -->



<!-- Content -->

<div id="content">



  
    <ul class="breadcrumb"><li><a href="/sms/index.php?r=site/index">主页</a><span class="divider">/</span></li><li><a href="/sms/index.php?r=transaction/studentPerformance/index">输入校外实习和特殊绩效分数</a><span class="divider">/</span></li><li class="active">2026-06-06<span class="divider">/</span></li><li class="active">更新</li><li class="active pull-right" style="margin-right:20px">第一 学期, 2026  <div id="timer" style="display:inline;"></div></li></ul><!-- breadcrumbs -->

    


    <div id="yw9"></div>


    
	
        
<div class="bootstrap-widget"><div class="bootstrap-widget-header"><i class="icon-edit"></i><h3>更新 输入校外实习和特殊绩效分数 2026-06-06</h3><div class="bootstrap-toolbar pull-right"><div class=" pull-right btn-group"><a class="btn" id="yw1" href="index.php?r=transaction/studentPerformance/">重返</a></div></div></div><div class="bootstrap-widget-content" id="yw0"><form class="form-horizontal" id="student-performance-m-form" action="/sms/index.php?StudentPerformanceM%5Bclass_id%5D=693&amp;StudentPerformanceM%5Bitem_id%5D=2449&amp;ajax=student-grid&amp;date=2026-06-06&amp;item_id=2449&amp;r=transaction%2FstudentPerformance%2Fupdate" method="post">
  <div class="alert in alert-block fade alert-info">
    <a class="close" data-dismiss="alert">×</a>
    带*号为必填项。  </div>

<div class="row-fluid">
  <div class="span6">
    <div class="control-group"><label class="control-label required" for="StudentPerformanceM_year">年份 <span class="required">*</span></label><div class="controls"><input class="span4" readonly="readonly" name="StudentPerformanceM[year]" id="StudentPerformanceM_year" type="text" value="2026" /></div></div>  </div>
  <div class="span6">
    <div class="control-group"><label class="control-label required" for="StudentPerformanceM_semester">学期 <span class="required">*</span></label><div class="controls"><input class="span4" maxlength="2" readonly="readonly" name="StudentPerformanceM[semester]" id="StudentPerformanceM_semester" type="text" value="1" /></div></div>  </div>
</div>
<div class="row-fluid">
  <div class="span12">
    <div class="control-group"><label class="control-label required" for="StudentPerformanceM_date">日期 <span class="required">*</span></label><div class="controls"><input class="span6" readOnly="readonly" name="StudentPerformanceM[date]" id="StudentPerformanceM_date" type="text" value="2026-06-06" /></div></div>  </div>
</div>
<div class="row-fluid">
  <div class="span12">
    <div class="control-group"><label class="control-label required" for="StudentPerformanceM_item_id">项目 <span class="required">*</span></label><div class="controls"><select class="span8" name="StudentPerformanceM[item_id]" id="StudentPerformanceM_item_id">
<option value=""></option>
<option value="22">PE CMO69 - 比赛 - 2018年学联足球县赛</option>
<option value="23">ACA CMO5 - 比赛-“光启杯”华文诗歌朗诵比赛</option>
<option value="24">CCD PO2 - 表演-CNY Event AEON MALL S2</option>
<option value="25">CCD PO3 - 表演-年初五董事家新春团拜</option>
<option value="26">CCD PO4 - 表演-Jementah灯会</option>
<option value="27">CCD PO5 - 表演-新春活动“祥狮献瑞迎丰年”</option>
<option value="28">CCD PO6 - 表演-Majlis Terbuka Semperna Tahun Baru Cina 2020</option>
<option value="29">CCD PO7 - 表演-庚子年新春大团拜</option>
<option value="30">CCD CMO1 - 比赛-第二届东海杯华语辩论邀请赛</option>
<option value="31">CCD CMO94 - 比赛-2021本土文化摄影比赛</option>
<option value="32">CCD EAO1 - 考试-2020年童军徽章考核</option>
<option value="33">CCD EAO2 - 培训-Bengkel Latihan Pertandingan Pertolongan Cemas</option>
<option value="34">CCD EAO3 - 考试-2020年柔道社升带考试</option>
<option value="35">CCD CMO3 - 比赛-第九届全国华族舞蹈公开赛</option>
<option value="36">CCD CMO28 - 比赛-第30届全国华人舞蹈节暨第19届全国华校校际舞蹈观摩赛</option>
<option value="37">PE CMO45 - 比赛-2018年学联乒乓（县赛）</option>
<option value="38">PE CMO53 - 比赛-Kejohanan Wushu &#039;Cari Bakat&#039; Sekolah-Sekolah N.S. Kali Ke-7, 2018</option>
<option value="39">CCD CMO5 - 比赛-汪旺年《海陆文化杯》挥春比赛</option>
<option value="40">CCD CMO6 - 比赛-森州武术龙狮总会2018年拿督黄国强杯传统南狮赛</option>
<option value="41">CCD CMO30 - 比赛-WER 2018 Malaysia Open</option>
<option value="42">CCD CMO7 - 比赛-2018年廿四节令鼓区域精英赛（森柔甲）</option>
<option value="43">CCD CMO31 - 比赛-2018年第5届马来西亚廿四节令鼓精英赛</option>
<option value="44">PE CMO52 - 比赛-Mini Kejohanan Bola Tampar Putrajaya 2018</option>
<option value="45">CCD CMO9 - 第五十六届振中男女童军营火会</option>
<option value="46">CCD CMO10 - 比赛-2018年第8届教育部全国学联武术锦标赛</option>
<option value="47">CCD CMO11 - 比赛-2018年第3届全国华文独中中华民族舞蹈观摩赛</option>
<option value="48">PE CMO59 - 比赛-第12届2018年全国华文独中田径锦标赛</option>
<option value="49">PE CMO63 - 比赛-2018年度全森15岁或以下青少年男女篮球选拔赛</option>
<option value="50">CCD CMO34 - 比赛-2018 福州中学生象棋锦标赛</option>
<option value="51">PE CMO54 - 比赛-2018年第13届全森校际武术锦标赛暨少儿武术比赛</option>
<option value="52">CCD CMO36 - 空白</option>
<option value="53">PE CMO68 - 比赛-AirAsia-BAM Kejohanan Liga Remaja Kebangsaan (Peringkat Negeri)2018 - Badminton</option>
<option value="54">PE CMO51 - 比赛-2018年学联排球（州赛）</option>
<option value="55">CCD CMO39 - 比赛-2018年芙蓉分会男女18岁以下篮球选拔赛</option>
<option value="56">CCD CMO12 - 比赛-马来西亚（亚洲）“崇YOUNG”戏剧比赛</option>
<option value="57">PE CMO65 - 比赛-2018年森美兰芙蓉县U17以下篮球选拔赛</option>
<option value="58">PE CMO55 - 比赛-2018年学联游泳&amp;水球州赛</option>
<option value="59">PE CMO66 - 比赛-2018年学联羽球县赛</option>
<option value="60">PE CMO60 - 比赛-2018年学联篮球县赛</option>
<option value="61">PE CMO61 - 比赛-2018年学联篮球州赛</option>
<option value="62">PE CMO48 - 比赛-2018年学联壁球（州赛）</option>
<option value="63">PE CMO67 - 比赛-2018年学联羽球州赛</option>
<option value="64">PE CMO46 - 比赛-2018年学联乒乓（州赛）</option>
<option value="65">PE CMO57 - 比赛-2018年学联田径县赛</option>
<option value="66">PE CMO56 - 比赛-2018年全国学联游泳&amp;水球赛</option>
<option value="67">CCD CMO23 - 比赛-2018年全国学联壁球赛</option>
<option value="68">PE CMO58 - 比赛-2018年学联田径州赛</option>
<option value="69">PE CMO50 - 比赛-2018年学联排球（县赛）</option>
<option value="70">PE CMO64 - 比赛-2018年森美兰芙蓉县U15以下篮球锦标赛</option>
<option value="71">CCD CMO40 - 比赛-2018年华总国油杯国际艺术节</option>
<option value="72">CCD CMO41 - 比赛-中国象棋学联赛</option>
<option value="73">CCD CMO42 - 比赛-2018年福联青全国中学生华语辩论赛</option>
<option value="74">CCD CMO43 - 比赛-第一届全国独中跆拳道锦标赛</option>
<option value="75">CCD CMO44 - 比赛-2019世界中学生华语辩论公开赛</option>
<option value="76">CCD CMO45 - 比赛-2019年第28届南马华文独中美诗杯华语文艺歌曲比赛</option>
<option value="77">CCD CMO46 - 比赛-马来西亚世纪国际音乐大赛</option>
<option value="78">CCD CMO47 - 比赛-第5届（2019年）马来西亚国际武术节摔跤</option>
<option value="79">CCD CMO48 - 比赛-TAR UC CHESS CHAMPION SHIP 2019</option>
<option value="80">CCD PO8 - 表演-Gala&#039;s Dance Showcase 2019</option>
<option value="81">CCD PO9 - 表演-雪兰莪诏安东山会馆晚宴邀演</option>
<option value="82">CCD PO10 - 表演-红酒大会</option>
<option value="83">CCD PO11 - 表演-Majlis Perasmian Pesta Air Port Dickson 2019</option>
<option value="84">CCD PO12 - 表演-花城中华文化之夜汇演</option>
<option value="85">CCD PO13 - 表演-鄧普勒野马捷兔会35周年慈善晚宴</option>
<option value="86">CCD PO14 - 表演-Pesta Tanglung 2019</option>
<option value="87">CCD PO15 - 表演-华乐团参与企业中秋庆典表演活动</option>
<option value="88">CCD PO16 - 表演-马潮联合会85周年联欢晚宴</option>
<option value="89">CCD PO17 - 表演-森美兰汽车暨银业公会第37周年会庆晚宴</option>
<option value="90">CCD CMI1 - 比赛-2019年班级羽球赛</option>
<option value="91">CCD CMI2 - 比赛-2019年班级篮球赛</option>
<option value="92">CCD CPI1 - CAMP-2019年扯铃学会训练营（二）</option>
<option value="93">CCD CPI2 - CAMP-2019年舞蹈学会3月生活营</option>
<option value="94">CCD CPI3 - CAMP-2019年“S.U.T”生活营</option>
<option value="95">CCD CPI4 - CAMP-Prologue · 序</option>
<option value="96">CCD CPI5 - CAMP-2019年图书馆服务团《炎叙》新生营</option>
<option value="97">CCD CPI6 - CMAP-戏剧学会新生营《明日之心》</option>
<option value="98">CCD CPI17 - CMAP-“稻香之乡”生活营</option>
<option value="99">CCD CPI18 - CAMP-《幻音之谜》生活营</option>
<option value="100">CCD CPI19 - CAMP-2019年华乐团3月份迎新暨集训营</option>
<option value="101">CCD CPI20 - CAMP-2019年管乐团3月份训练营及新生交流营</option>
<option value="102">CCD CPI21 - CAMP-2019年扯铃学会训练营（一）</option>
<option value="103">CCD PO18 - 表演-ChildAid Asia KL 2019</option>
<option value="104">CCD CMO49 - 比赛-Gamuda walk student&#039;s chinese chess competition</option>
<option value="105">CCD CPO1 - CAMP-The Voice 2.0 音乐营</option>
<option value="106">CCD CPO2 - CAMP-第十届全柔童军徽章鉴定营</option>
<option value="107">CCD CPO3 - CAMP-第49届中学课外活动干部训练营</option>
<option value="108">CCD CPO4 - CAMP-Perkhemahan Perdana Sekolah-sekolah Swasta Peringkat Negeri Sembilan Tahun 2019</option>
<option value="109">CCD CPO5 - CAMP-Perkhimatan Ahli St John Kem Jati Diri SJK(C) CHI HUA SEREMBAN</option>
<option value="110">CCD EAO4 - 培训-PERKHIDMATAN PERTOLOGAN CEMAS PELAJAR ST.JOHNS</option>
<option value="111">CCD EAO5 - 培训-SJAM NSDK STATE ANNUAL INSPECTION 2019</option>
<option value="112">CCD SO1 - 服务-无极圣母芙蓉分会素食义卖会</option>
<option value="113">CCD SO2 - 服务-MBO SJAM NATIONAWIDE BLOOD DONATION CAMPAIGN DRIVE 6.0</option>
<option value="114">CCD SO3 - 服务-爱我马来西亚国庆开旗礼</option>
<option value="115">CCD EAO6 - 培训-李三天地中秋嘉年华</option>
<option value="116">CCD CMO50 - 比赛-2019年二十四节令鼓区域精英赛（南马区）</option>
<option value="117">CCD PO19 - 表演-李三天地开幕演出</option>
<option value="118">CCD CPI22 - CAMP-2019廿四节令鼓队3月集训营</option>
<option value="119">CCD PO20 - 表演-启华小学表演</option>
<option value="120">CCD PO21 - 表演-Persembahan Majlis Rumah Terbuka Malaysia Tahun Baru Cina 2019</option>
<option value="121">CCD PO22 - 表演-Lawatan di Sungai Ujong Walk</option>
<option value="122">CCD PO23 - 表演-2019芙小挥春比赛</option>
<option value="123">CCD PO24 - 表演-2019己亥年新春大团拜</option>
<option value="124">CCD PO25 - 表演-JEMPUTAN MENYERTAI KARNIVAL TAHUN BARU CINA 2019</option>
<option value="125">CCD PO26 - 表演-2019年沉香新春活动：福禄财到旺沉香活动</option>
<option value="126">CCD CMO51 - 比赛-2019年马来西亚（亚洲）中学“崇Young”戏剧比赛</option>
<option value="127">CCD CMO52 - 比赛-2019年《童城》男女童军技艺邀请暨营火会</option>
<option value="128">CCD CMO53 - 比赛-BEAVER 2019</option>
<option value="129">CCD CMO54 - 比赛-Berjaya Teenstar Challenge 2019</option>
<option value="130">CCD CMO55 - 比赛-2019年全国中学华语辩论比赛-全中辨（森美兰洲赛）</option>
<option value="131">CCD CMO56 - 比赛-2019第二届诚兴有机食品杯南马四州中学象棋锦标赛</option>
<option value="132">CCD CMO57 - 比赛-2019年东海杯华语辩论赛</option>
<option value="133">CCD CMO58 - 比赛-1st PPM PUPG Mobile Online Tournament 2019</option>
<option value="134">CCD CMO59 - 比赛-第二届诚兴有机食品杯南马四州中学象棋团体赛</option>
<option value="135">CCD CMO60 - 比赛-2019万能青年全国传统南狮争霸赛</option>
<option value="136">CCD CMO61 - 比赛-2019雄狮传统争霸战</option>
<option value="137">CCD PO27 - 空白</option>
<option value="138">CCD EAO7 - 交流-2019年全国扯铃观摩去暨交流营-铃·迹</option>
<option value="139">CCD EAO8 - 交流-VISIT TUNKU ABDUL RAHMAN UNIVERSITY  COLLEGE（TAR UC）</option>
<option value="140">CCD EAO9 - 交流-第六届南马独中合唱观摩会2019</option>
<option value="141">CCD EAO10 - CAMP-Perkhemahan Persedian (Pra-Jambori) Jambori Pengakap Sedunia Kali ke 24, 2019</option>
<option value="142">CCD EAO11 - 交流-楷模媒体设计学院2019开放日</option>
<option value="143">CCD EAO12 - 考试-UJIAN LENCANA EKSPEDISI PENGAKAP REMAJA TAHUN 2019</option>
<option value="144">CCD CPO6 - CAMP-2019第48届YCA干部训练营</option>
<option value="145">CCD CPO7 - CAMP-2019年Sunway独中领袖培训营</option>
<option value="146">CCD EAO13 - 服务-2019年慈济日浴佛大典志工服务</option>
<option value="147">CCD EAO14 - 服务-2019芙小运动会</option>
<option value="148">CCD EAO15 - 交流-2019INTI ICB Exchange Camp &amp; ICB Concert &quot;VIva La Music&quot;</option>
<option value="149">CCD EAO16 - Empty</option>
<option value="150">CCD EAO17 - 比赛-Majlis Penyampaiaan Hadiah Pertandingan Mencipta Video Kilp &quot;My School, My Joy, My Pride&quot; Peringkat Negeri Sembilan</option>
<option value="151">CCD PO28 - 表演-IJM LAND CARNIVAL 2018</option>
<option value="152">CCD PO29 - 表演-2018年企业新春表演活动</option>
<option value="153">CCD PO30 - 表演-2018年飞跃50载芙中情永在</option>
<option value="154">CCD PO31 - 表演-2018年 On Semiconductor Seremban Technical Dinner</option>
<option value="155">CCD PO32 - 表演-2018年马来西亚国际关公文化旅游节</option>
<option value="156">CCD EAO18 - 交流-2018年第2届森美兰合唱节</option>
<option value="157">CCD PO33 - 表演-2018年森州中秋节庆典</option>
<option value="158">CCD PO34 - 表演-Jemputan Persembahan Untuk Pertandingan Deklamasi Sajak Bahasa Cina Peringkat Kebangsaan</option>
<option value="159">CCD PO35 - LNM Wealth Advisory SDN BHD 公司周年庆</option>
<option value="160">CCD PO36 - 表演-2018年CNY Calligraphy Competition</option>
<option value="161">CCD PO37 - 演出-2018年Panasonic Company Dinner</option>
<option value="162">CCD PO38 - 演出-2018年新年采青</option>
<option value="163">CCD PO39 - 表演-2018年企业新春表演比赛</option>
<option value="164">CCD PO40 - 表演-戊戌新年芙蓉庙会</option>
<option value="165">CCD CMO62 - 比赛-2018年世界中学生华语辩论社公开赛</option>
<option value="166">CCD CMO63 - 比赛-2018年第30届全国华人舞蹈节暨第19届全国华校校际舞蹈观摩赛</option>
<option value="167">CCD CMO64 - 比赛-2018年全森中小学华语文艺歌曲歌唱比赛</option>
<option value="168">CCD CMO65 - 比赛-2018年第27届南马华文独中美诗杯文艺歌曲独唱赛</option>
<option value="169">CCD CMO66 - 比赛-2018年第5届马来西亚二十四节令鼓队精英赛</option>
<option value="170">CCD CMO67 - 比赛-2018年中国象棋学联赛州赛</option>
<option value="171">CCD CMO68 - 比赛-2018年柔甲森华文独钟话语辩论赛“美诗杯”</option>
<option value="172">CCD EAO19 - 交流-2018年全柔中学扯玲交流营</option>
<option value="173">CCD EAO20 - 交流-Bengkel Latihan Pertandingan Pertolongan Cemas &amp; Perawatan SJAM NS Peringkat Negeri Sembilan 2018</option>
<option value="174">CCD EAO21 - 交流-2018年观摩交流会兼一日游</option>
<option value="175">CCD EAO22 - CAMP-2018年Youth Circle of Arts</option>
<option value="176">CCD CPO8 - CAMP-2018年第47届全国中学干部训练营（YCA）</option>
<option value="177">CCD EAO23 - 交流-2018年天文交流会</option>
<option value="178">CCD EAO24 - 交流-2018年全国童军技艺邀请赛</option>
<option value="179">CCD CPO9 - CAMP-2018年第4届全国中学生精英领袖训练营</option>
<option value="180">CCD EAO25 - 考试-2018年Ujian Lencana Ekspedisi</option>
<option value="181">CCD CPO10 - CAMP-Perkhemahan Kadet St.John Ambulance Peringkat N.S.2018</option>
<option value="182">CCD CPO11 - CAMP-2018年6月份波中交流营</option>
<option value="183">CCD CPO12 - CAMP-2018年第七届全国青少年文化与艺术生活营</option>
<option value="184">CCD PO41 - 表演-2018年《第16届戏聚奖》-《聚说》概念发表会</option>
<option value="185">CCD SO4 - 服务-2018年张氏公会义卖会</option>
<option value="186">CCD SO5 - 服务-2018年Bantuan Perkhimatan St.John Ambulans</option>
<option value="187">CCD CPO13 - CAMP-2018年Sunway独中领袖训练营（SALT）</option>
<option value="188">CCD EAI1 - 额外活动-2018年制作饺子活动</option>
<option value="189">CCD EAO26 - 额外活动-2018年拜访老人院</option>
<option value="190">CCD EAO27 - 额外活动-2018年知知港户外猎影</option>
<option value="191">CCD CPI23 - CAMP-2018年音乐学会3月份《追音筑梦》训练营</option>
<option value="192">CCD CPI24 - CAMP-2018年二十四节令鼓队3月份集训营</option>
<option value="193">CCD CPI25 - CAMP-2018年乒乓学会3月份《乒.训》迎新营</option>
<option value="194">CCD CPI26 - CAMP-2018年扯铃学会3月份训练营</option>
<option value="195">CCD CPI27 - CAMP-2018年戏剧学会3月份新生营《魔幻世界》</option>
<option value="196">CCD CPI28 - CAMP-2018年管乐团3月份练习营</option>
<option value="197">CCD CPI29 - CAMP-2018年华乐团3月份迎新暨集训营</option>
<option value="198">CCD EAI2 - 额外活动-2018年UNESCO售卖自制日历活动</option>
<option value="199">CCD EAI3 - 额外活动-2018年图书馆服务团“人日”活动</option>
<option value="200">CCD EAO28 - 旅游-2018史地学会马六甲一日游</option>
<option value="201">CCD CPI30 - CAMP-2018年二十四节令鼓队11月份训练营</option>
<option value="202">CCD EAI5 - 欢送-2018年廿十四节令鼓高三队员欢送会</option>
<option value="203">CCD CMI3 - 比赛-2018年《崛起》短片制作比赛</option>
<option value="204">CCD EAI6 - 表演-2018年芙中街舞社“Flashmob”</option>
<option value="205">CCD EAI4 - 交流-2018年天文学会与华仁中学天文学会交流营</option>
<option value="206">CCD CPI31 - CAMP-2018年华乐团12月份集训营暨叙别会</option>
<option value="207">CCD CPI32 - CAMP-2018年舞蹈学会11月份生活营</option>
<option value="208">CCD EAI8 - 聚会-2018年芙中廿十四节令鼓队之精英赛庆功宴及鼓队庆生</option>
<option value="209">CCD CPI33 - CAMP-2018年圣约翰救伤队第一届《燃》特训营</option>
<option value="210">CCD EAI9 - 额外活动-2018念华文学会《明月当空，故日情怀》中秋传情及灯谜活动</option>
<option value="211">CCD CPI34 - CAMP-2018年管乐团12月份年终训练营</option>
<option value="212">CCD CPI35 - CAMP-2018年辩论社《首.聚》新生暨培训营</option>
<option value="213">CCD EAI10 - 额外活动-2018年摄影学会售卖班级照及学会照</option>
<option value="214">CCD CPI36 - CAMP-2018年芙中童军团全国徽章鉴定营</option>
<option value="215">CCD CPI37 - CAMP-2018年童军团73周年团庆午宴筹备营（一）</option>
<option value="216">CCD CPI38 - CAMP-2018年芙中街舞小组《Unity Camp》</option>
<option value="217">CCD CPI39 - CAMP-2018年童军团73周年团庆午宴筹备营（二）</option>
<option value="218">CCD EAI11 - 额外活动-2018年社会服务团福满希望</option>
<option value="219">CCD EAI12 - 额外活动-2018年圣约翰救伤队防止滥用毒品（展览））</option>
<option value="220">CCD CPI40 - CAMP-2018年管乐团新生交流营</option>
<option value="221">CCD CMI4 - 比赛-2018年商学会足球比赛售卖活动</option>
<option value="222">CCD CMI5 - 比赛-2018年数学学会魔术方块比赛</option>
<option value="223">CCD EAO29 - 额外活动-2018年圣约翰救伤队售旗活动</option>
<option value="224">CCD CMI6 - 比赛-2018年高中班级足球赛</option>
<option value="225">CCD CPI41 - CAMP-2018年廿十四节令鼓8月训练营</option>
<option value="226">CCD EAO30 - 额外活动-2018年摄影学会马六甲户外猎影</option>
<option value="227">CCD CPI42 - CAMP-2018年柔道社《聚》社团内部培训营</option>
<option value="228">CCD EAI13 - 游戏-2018年天文学会与数学学会过站游戏</option>
<option value="229">CCD CMI7 - 比赛-2018年班级排球赛</option>
<option value="230">CCD EAI14 - 额外活动-2018年辅导团和吉他社《裂缝中的阳光》</option>
<option value="231">CCD CPI43 - CAMP-2018年廿十四节令鼓新生营</option>
<option value="232">CCD EAO31 - 额外活动-2018年UNESCO户外考察一日游</option>
<option value="233">CCD CPI44 - CAMP-2018年管乐团6月份训练营</option>
<option value="234">CCD CMI8 - 比赛-2018年班级篮球赛</option>
<option value="235">CCD EAO32 - 交流-2018年天文学会与巴生兴华中学交流</option>
<option value="236">CCD CPI45 - CAMP-2018年华文学会文化营《文·缘聚》</option>
<option value="237">CCD EAI15 - 额外活动-2018年辅导团《感恩的信，感谢有你》</option>
<option value="238">CCD CMI9 - 比赛-2018年全校华语文艺歌曲及校园民歌歌唱比赛</option>
<option value="239">CCD CPI46 - CAMP-2018年廿十四节令鼓6月交流营</option>
<option value="240">CCD CPI47 - CAMP-2018年影音技术社Action3.0培训营</option>
<option value="241">CCD CMI10 - 比赛-2018年《Untitled》摄影比赛</option>
<option value="242">CCD CPI48 - CAMP-2018年芙蓉中华中学管乐团6月训练营</option>
<option value="243">CCD CPI49 - CAMP-2018年图书馆服务团《聚》生活营</option>
<option value="244">CCD CPI50 - CAMP-2018年数学学会《MYSTIC》学习营</option>
<option value="245">CCD EAO33 - 旅游-2018年辅导团凝聚You And I</option>
<option value="246">CCD EAO34 - 旅游-2018年史地学会马六甲户外教学营</option>
<option value="247">CCD EAO35 - 旅游-2018年英文学会清理波德申海滩半日游</option>
<option value="248">CCD CPI51 - CAMP-2018年壁球社”RiseTogether”训练营交流会</option>
<option value="249">CCD CPI52 - CAMP-2018年羽球社巴生兴华羽球学会交流营</option>
<option value="250">CCD CPI53 - CAMP-2018年社会服务团”营乐无穷2.0”生活营</option>
<option value="251">CCD CPI54 - CAMP-2018年戏剧学会《再一次感动》小品演出筹备营</option>
<option value="252">CCD CPI55 - CAMP-2018年社会服务团生活营“营乐无穷2.0”</option>
<option value="253">CCD CPI56 - CAMP-2018年摄影学会《夏夜星光》生活营</option>
<option value="254">CCD CMO69 - 比赛-2019年己亥年芙蓉新城挥春赛</option>
<option value="255">CCD CMO70 - 比赛-2019年培风中学科技研习营</option>
<option value="256">CCD CMO71 - 比赛-2019年己亥千人挥春比赛</option>
<option value="257">CCD CMO72 - 比赛-2019年第二届中秋节书法比赛</option>
<option value="258">CCD CMO73 - 比赛-2019年诸事旺新春嘉年华</option>
<option value="259">CCD CMO74 - 比赛-2019 Pertandingan Kaligrafi Sekolah-Sekolah Rendah Dan Menengah Peringkat Negeri Kali Ke-36 Sempena Tahun Baru Cina</option>
<option value="260">CCD CMO75 - 比赛-2019年World Educational Robot Contest</option>
<option value="261">CCD CMO76 - 比赛-2019年己亥年公开挥春赛</option>
<option value="262">CCD CMO78 - 比赛-2019年沈慕羽语录全国中小学书法比赛</option>
<option value="263">CCD CMO77 - 比赛-2019年中学高中组反毒海报设计比赛</option>
<option value="264">CCD CMO79 - 比赛-2019年全森中小学书法比赛</option>
<option value="265">CCD CMO80 - 比赛-Pertandingan Kaligrafi Sempena Tahun Baru Cina 2019</option>
<option value="266">CCD CMO81 - 比赛-《逢甲杯》2019年全国中学生正体书法比赛</option>
<option value="267">CCD CMO82 - 比赛-2019年己亥年马来西亚林氏宗亲总会长杯全国榜书精英赛</option>
<option value="268">CCD CMO83 - 比赛-RIMBAYU IJM LAND 2019挥春比赛</option>
<option value="269">CCD CMO84 - 比赛-2019年己亥年挥春比赛</option>
<option value="270">CCD PO42 - 表演-2020年《Lodge Nanyang Installation Meeting》</option>
<option value="271">CCD EAO36 - 交流-2018音乐学会居銮观摩交流会兼一日游</option>
<option value="272">CCD EAI16 - 讲座-2019圣约翰救伤队艾滋病讲座</option>
<option value="273">CCD CPO14 - CAMP-2019年《爬山康乐营》</option>
<option value="274">CCD CPO15 - CAMP-2019年《Astrophotography2.0.1》</option>
<option value="275">CCD SI1 - 服务-2019辅导团Free Hug之知足常乐</option>
<option value="276">CCD SI2 - 服务-2019辅导团之你是我的太阳</option>
<option value="277">CCD CPO16 - CAMP-2019年《两天一夜 PDCamp》</option>
<option value="278">CCD CPO17 - CAMP-2019年《沙滩排球之旅》</option>
<option value="279">CCD EAI17 - 额外活动-2019年华文学会《月满情浓》全校中秋活动</option>
<option value="280">CCD EAI18 - 额外活动-2019年商学会制作饺子活动</option>
<option value="281">CCD CPO18 - CAMP-2019年《2019年芙中童军团徽章鉴定营》</option>
<option value="282">CCD CPO19 - CAMP-2019年图书馆服务团《蛹》生活营</option>
<option value="283">CCD EAO37 - 额外活动-2019年十一届香港中乐指挥大师班</option>
<option value="284">CCD EAI19 - 额外活动-2019年图书馆服务团咖啡工作坊</option>
<option value="285">CCD PO43 - 表演-2019年《华乐团参与企业中秋庆典表演活动》</option>
<option value="286">CCD EAI20 - 额外活动-2019年辅导团《家》</option>
<option value="287">CCD EAI21 - 额外活动-2019年社会服务团《回收旧衣服活动》</option>
<option value="288">CCD EAI22 - 额外活动-2019年Unesco售卖自制日历</option>
<option value="289">CCD CPI57 - CAMP-2019年管乐团5月份年中训练营</option>
<option value="290">CCD EAO38 - 额外活动-2019年辅导团《拜访老人院》</option>
<option value="291">CCD CPO20 - 培训营-2019年摄影天文《星迹》执委培训营</option>
<option value="292">CCD CPI58 - CAMP-2019管乐团《樂.世代》演奏会筹备营</option>
<option value="293">CCD EAI23 - 额外活动-2019年摄影学会《售卖班级照及学会照》</option>
<option value="294">CCD CPI59 - CAMP-2019年华乐团6月份《符中观响》交流暨集训营</option>
<option value="295">CCD CMI11 - 比赛-2019年《2019年全校文艺歌曲及校园民歌歌唱比赛》</option>
<option value="296">CCD EAI24 - 额外活动-2019年天文学会天文展《星曦》</option>
<option value="297">CCD EAI25 - 额外活动-2019年国文学会母亲节售卖花束</option>
<option value="298">CCD CPI60 - CAMP-2019年音乐学会《音悦.梦》生活营</option>
<option value="299">CCD CMI12 - 比赛-2019年弈棋学会全校中国象棋比赛</option>
<option value="300">CCD CMI13 - 比赛-2019年影音技术社《续集》短片制作比赛</option>
<option value="301">CCD EAI26 - 额外活动-2019年美术学会《寻艺》画展</option>
<option value="302">CCD CPO21 - CAMP-2019年《Perkhemahan Perdana Sekolah-Sekolah Swasta Peringkat Negeri Sembilan Tahan 2019》</option>
<option value="303">CCD CMI14 - 比赛-2019年电脑学会电竞赛</option>
<option value="304">CCD CPI61 - CAMP-2019年12月份《追溯》集训营暨叙别会</option>
<option value="305">CCD CPI62 - CAMP-2019年生活技能学会生活营</option>
<option value="306">CCD CMI15 - 比赛-2019年音乐学会马来文艺歌曲及校园民歌歌唱比赛</option>
<option value="307">0 - 无（可填写）</option>
<option value="308">CCD CPI64 - CAMP-2019年二十四节令鼓队6月份训新生营暨训练营</option>
<option value="309">CCD EAO39 - 额外活动-2019年24节令鼓队海南交流会</option>
<option value="310">CCD CPI65 - CAMP-2019年《2020年芙蓉中华中学戏剧学会35周年庆第一次筹备营《秘密计划壹》》</option>
<option value="311">CCD EAO40 - 考试-2019年圣约翰救伤队专章考试营</option>
<option value="312">CCD CPI67 - CAMP-2019年管乐团12月份年终训练营</option>
<option value="313">CCD CPI68 - CAMP-2019年戏剧学会内训营《练习生出道计划》</option>
<option value="314">CCD CPI69 - CAMP-2019年二十四节令鼓《12月集训营》</option>
<option value="315">CCD CPI70 - (空）</option>
<option value="316">CCD EAI27 - 额外活动-2019年吉他社《享乐》</option>
<option value="317">CCD CPI71 - 技术营-2019年童军团技术营</option>
<option value="318">CCD CPI72 - CAMP-2019年街舞社《PROCEED.前进》</option>
<option value="319">CCD CMI16 - 比赛-2019年童军团《PUBG Mobile Online Tournament》</option>
<option value="320">CCD CPI73 - CAMP-2019年辩论社《明.辩》培训营</option>
<option value="321">CCD CMO85 - 比赛-2019年二十四节令鼓队《海南世界大会与海南省各学校交流》</option>
<option value="322">CCD CPO22 - CAMP-2019年《《稻香之乡》生活营》</option>
<option value="323">CCD EAO41 - 额外活动-2019年大众传播社《媒体工作体验之旅》</option>
<option value="324">CCD EAO42 - 额外活动-2019年摄影学会《布城回忆录》户外猎影</option>
<option value="325">CCD EAO43 - 额外活动-2019年摄影学会《丹绒士拔户外猎影》</option>
<option value="326">CCD EAO44 - 额外活动-2019年童军团消防局一日游</option>
<option value="327">CCD EAO45 - 额外活动-2019年电脑学会《电脑学会户外学习一日游》</option>
<option value="328">CCD EAO46 - 额外活动-2019年UNESCO《吉隆坡国油双峰塔一日游》</option>
<option value="329">CCD EAO47 - 额外活动-2019年数学学会《国家博物馆和艺术画廊半日游》</option>
<option value="330">CCD EAI28 - 额外活动-2018年摄影学会《影》摄影展</option>
<option value="331">CCD EAO48 - 观演-2018年二十四节令鼓队《校外观演》</option>
<option value="332">CCD CPI74 - CAMP-201年音乐学会《寻音逐梦》训练营</option>
<option value="333">CCD CMO86 - 比赛-2018年《2018年世界中学生华语辩论公开赛》</option>
<option value="334">CCD CMO87 - 比赛-2018年马来西亚（亚洲）中学“崇 YOUNG”戏剧比赛</option>
<option value="335">ACA CMO2 - 比赛-YCF Photomicrography Competition</option>
<option value="336">ACA CMO3 - 比赛-YCF Digital Sensor Competition</option>
<option value="337">ACA CMO4 - 比赛-第七届中学数学奥林匹克生活营暨国际竞赛国手遴选</option>
<option value="338">PE CMO1  - 比赛-2020年学联羽球赛（州赛） </option>
<option value="339">PE CMO2  - 比赛-2020年学联羽球赛（县赛） </option>
<option value="340">PE CMO3 - 比赛-2020年学联高尔夫球赛（州赛）</option>
<option value="341">PE CMO4 - 比赛-Pertandingan &amp; Program Pembangunan Sukan Golf Majlis Sukan Sekolah Negeri Sembilan (MSSNS) Tahun 2020（州赛）</option>
<option value="342">PE CMO5 - 比赛-2020年学联壁球赛（州赛）</option>
<option value="343">ACA CMO1 - 比赛-2017年全国华文独中科技专题研习营暨机器人竞赛</option>
<option value="344">ACA CMO6 - 比赛-Public Speaking Competition</option>
<option value="345">ACA CMO7 - 比赛-Pertandingan Forum Pelajar 2017 （Zon C）</option>
<option value="346">ACA CMO8 - 比赛-Mind Competition</option>
<option value="347">ACA CMO9 - 比赛-Sunway College A-Level Math &amp; Logic Challenge</option>
<option value="348">ACA CMO10 - 比赛-第19届福联青全国中学华语辩论比赛</option>
<option value="349">ACA CPO1 - CAMP-2017年马来西亚华文独中科学营</option>
<option value="350">PE CMO6 - 比赛-2020年学联田径赛（县赛）</option>
<option value="351">ACA CMO11 - 比赛-6th International English Debate Competition</option>
<option value="352">ACA CMO12 - 比赛-2017年“新纪元杯”全国华语诗歌朗诵海选</option>
<option value="353">ACA CMO13 - 比赛-2017 马来西亚清华盃化学科能力竞赛</option>
<option value="354">ACA CMO14 - 比赛-MIA 32nd Nationwide Art&amp;Design Competition</option>
<option value="355">ACA CMO15 - 比赛-2017年“新纪元杯”全国华语诗歌朗诵比赛</option>
<option value="356">ACA CMO16 - 比赛-Sunway College A-Level Math &amp; Logic Challenge</option>
<option value="357">ACA CMO17 - 比赛-马来西亚十大杰出美术青少年大赛</option>
<option value="358">ACA CMO18 - 比赛-AIMO 亚洲国际数学奥林匹克公开赛</option>
<option value="359">ACA CMO19 - 比赛-HELP Law Olympiad 2017</option>
<option value="360">ACA CMO20 - 比赛-2017年第26届美诗杯南马区华文独中华语文艺歌唱比赛</option>
<option value="361">ACA CMO21 - 比赛-HELP University 6th International English Debate Competition</option>
<option value="362">ACA CMO22 - 比赛-Pertandingan Olimpiad Matematik Kebangsaan OMK 2017</option>
<option value="363">ACA CMO23 - 比赛-2017年第10届“汉语桥”世界中学生中文比赛</option>
<option value="364">ACA CMO24 - 比赛-第39届(2017年)全国华文独中华国英三语演讲比赛</option>
<option value="365">ACA CMO25 - 比赛-2017年成大数理比赛</option>
<option value="366">PE CMO7 - 比赛-2020年学联越野赛跑（州赛） </option>
<option value="367">ACA CMO26 - 比赛-NATIONAL MATHS MARATHON 2017</option>
<option value="368">PE CMO8 - 比赛-2020年学联越野赛跑（县赛）</option>
<option value="369">ACA CPO2 - CAMP-马六甲古迹探索之旅</option>
<option value="370">ACA CMO27 - 比赛-2017年全森中小学华语文艺歌曲独唱赛</option>
<option value="371">ACA CPO3 - CAMP-商业学户外教学（国家银行与Beryl厂与你有约）</option>
<option value="372">ACA CMO28 - 比赛-第十届精英杯亚洲中学华语辩论公开赛2017</option>
<option value="373">PE CMO9 - 比赛-2020年学联游泳赛（州赛）</option>
<option value="374">PE CMO10 - 比赛-2020年学联水球赛（州赛）</option>
<option value="375">PE CMO11 - 比赛-2020年学联排球赛（县赛）</option>
<option value="376">PE CMO12 - 比赛-2020年Pertandingan Klip Video Kemahiran Sukan Ping Pong（Peringkat Negeri）</option>
<option value="377">PE CMO13 - 比赛-2020年Pertandingan Klip Video Kemahiran Sukan Ping Pong （Peringkat Daerah）</option>
<option value="378">PE CMO14 - 比赛-2019年年学联乒乓赛（县赛）</option>
<option value="379">ACA CMI1 - 比赛-2017 English Elocution Competition</option>
<option value="380">ACA CMI2 - 比赛-2017 English Essay Writing Competition</option>
<option value="381">ACA CMI3 - 比赛-Pertandingan Syarahan Tiga Bahasa</option>
<option value="382">ACA CMI4 - 比赛-2017年第六届海外华裔青少年中华文化大赛</option>
<option value="383">PE CMO15 - 比赛-2019年学联乒乓赛（州赛）</option>
<option value="384">PE CMO16 - 比赛-2019年度第四十届全森少年赛黄朝恩杯乒乓锦标赛</option>
<option value="385">PE CMO17 - 比赛-2019年学联壁球赛（州赛）</option>
<option value="386">PE CMO18 - 比赛-Negeri Sembilan Senior League 2019 - 1st Leg Under 21</option>
<option value="387">ACA CMO29 - 比赛-第一届现场反毒海报设计比赛</option>
<option value="388">ACA CMO30 - 比赛-第36届全森中小学挥春观摩赛</option>
<option value="389">ACA CMO31 - 比赛-森美兰福建会馆“第24届墨海翻腾福满年”</option>
<option value="390">ACA CMO32 - 比赛-2019己亥年芙蓉新城挥春比赛</option>
<option value="391">ACA CMO33 - 比赛-2019己亥千人挥春比赛</option>
<option value="392">ACA CMO34 - 比赛-汝来中央狮子会主办2019己亥年挥春比赛</option>
<option value="393">ACA CMO35 - 比赛-《朱帨迎祥·喜迎春》挥春比赛</option>
<option value="394">ACA CMO36 - 比赛-9th Secondary School Math Olympiad Training Camp 2019</option>
<option value="395">ACA CMO37 - 比赛-第二届（2019年度）全国母亲节颂文比赛</option>
<option value="396">ACA CMO38 - 比赛-2019年第12届“汉语桥”世界中学生中文比赛</option>
<option value="397">ACA CMO39 - 比赛-The 1st Xiamen University Malaysia Mathematics Competition</option>
<option value="398">ACA CMO40 - 比赛-2019年全森中小学书法比赛</option>
<option value="399">ACA CMO41 - 比赛-Sunway College A-Level Math&amp;Logic Challenge 2019:National Challege</option>
<option value="400">ACA CMO42 - 比赛-Pertandingan Olimpiad Matematik Kebangsaan(OMK)2019</option>
<option value="401">ACA CMO43 - 比赛-Kangaroo Math Competition 2nd Round (KMC2) 2019</option>
<option value="402">ACA CMO44 - 比赛-2019 AMC数学比赛</option>
<option value="403">ACA CMO45 - 比赛-Festival Bahasa dan Sastera 2019-Pertandingan Koir</option>
<option value="404">ACA CMO46 - 比赛-第三十六届成大数理比赛</option>
<option value="405">ACA CMO47 - 比赛-2019年第41届全国华文独中三语演讲比赛</option>
<option value="406">ACA CMO48 - 比赛-KL Law Olympiad 2019</option>
<option value="407">ACA CMO49 - 比赛-第一届育成杯中学数学竞赛</option>
<option value="408">ACA CMO50 - 比赛-2019年第12届“汉语桥”世界中学生中文比赛（中国）</option>
<option value="409">ACA CMO51 - 比赛-English Language Carnival 2019</option>
<option value="410">PE CMO19 - 比赛-2019年学联排球赛（县赛）</option>
<option value="411">PE CMO20 - 比赛-2019年学联排球赛（州赛）</option>
<option value="412">PE CMO21 - 比赛-KEJOHANAN BOLA TAMPAR 5 PENJURU U14 LELAKI 2019</option>
<option value="413">PE CMO22 - 比赛-2019年Kejohanan Bola Tampar Bawah 18 tahun </option>
<option value="414">PE CMO23 - 比赛-2019年第14届全森校际武术锦标赛暨少儿武术比赛</option>
<option value="415">PE CMO24 - 比赛-KEJOHANAN WUSHU KPM - WFM KE-9, 2019</option>
<option value="416">PE CMO25 - 比赛-Pertandingan WuShu Remaja 2019 （州赛）</option>
<option value="417">PE CMO26 - 比赛-2019年传聚3.0武萃 Wucui Wushu Championship</option>
<option value="418">PE CMO27 - 比赛-2019年第1届济州国际武术大赛</option>
<option value="419">PE CMO28 - 比赛-2019年第8届世界传统武术锦标赛</option>
<option value="420">PE CMO29 - 比赛-2019年第14届香港国际武术比赛</option>
<option value="421">PE CMO30 - 比赛-2019年第27届全国武术锦标赛 （全国赛）</option>
<option value="422">PE CMO31 - 比赛-55th Milo PRAM Malaysia Invitational National Age Group Waterpolo Championships 2019</option>
<option value="423">PE CMO32 - 比赛-2019年全国学联水球锦标赛</option>
<option value="424">PE CMO33 - 比赛-Swimming Championships 2019 （州赛）</option>
<option value="425">PE CMO34 - 比赛-2019年学联游泳&amp;水球赛（州赛）</option>
<option value="426">PE CMO35 - 比赛-2019年学联田径赛（县赛）</option>
<option value="427">PE CMO36 - 比赛-2019年学联田径赛（州赛）</option>
<option value="428">PE CMO37 - 比赛-2019年学联篮球赛（县赛）</option>
<option value="429">PE CMO38 - 比赛-2019年学联篮球赛（州赛）</option>
<option value="430">PE CMO39 - 比赛-4th Gatorade High School Basketball Championship 2019 </option>
<option value="431">PE CMO40 - 比赛-2019年学联羽球赛（县赛）</option>
<option value="432">PE CMO41 - 比赛-2019年学联羽球赛（州赛）</option>
<option value="433">PE CMO42 - 比赛-Liga Badminton Remaja Kebangsaan Airasia-BAM 2019 </option>
<option value="434">PE CMO43 - 比赛-Pertandingan Badminton Beregu Lelaki Sempena Bulan Sukan Malaysia （州赛）</option>
<option value="435">PE CMO44 - 比赛-2019年学联足球赛（县赛）</option>
<option value="436">PE CMO62 - 2018年全国学联篮球赛</option>
<option value="437">ACA CMI5 - 比赛-2019年全校华文大比拼</option>
<option value="438">PE CMO47 - 比赛-2018年学联保龄球(县赛)</option>
<option value="439">PE CMO49 - 比赛-NS CLOSED 2018</option>
<option value="440">ACA CMO52 - 比赛-第一届现场反毒海报设计比赛</option>
<option value="441">ACA CPI1 - CAMP-绢扇工笔画工作坊</option>
<option value="442">ACA CMI6 - 比赛-Pertandingan Forum BM 2019</option>
<option value="443">ACA CMI7 - 筹委 - 2019 English Elocution Competition</option>
<option value="444">ACA CMI8 - 比赛-2019年全校散文创作比赛</option>
<option value="445">ACA CMI9 - 比赛-English essay writing Competition 2019 </option>
<option value="446">ACA CMI10 - 比赛-2019年全国华教常识比赛</option>
<option value="447">ACA CMI11 - 比赛-2019年全校华语演讲比赛</option>
<option value="448">ACA CMI12 - 筹委 - Trilingual Competition 2019</option>
<option value="449">ACA CMI13 - 比赛-商业广告及现场演绎比赛</option>
<option value="450">ACA CMI14 - 比赛-2019己亥年芙蓉中华中学全校挥春比赛</option>
<option value="451">ACA CMI15 - 比赛-Pertandingan Syarahan Bahasa Melayu 2019</option>
<option value="452">ACA CMI16 - 比赛-2019年第四届高一级才艺表演</option>
<option value="453">ACA CPI2 - CAMP-高中音乐选修音乐会</option>
<option value="454">ACA CPI3 - CAMP-Sketching of Figure Drawing by Dasein Academy of Art</option>
<option value="455">ACA CPI4 - CAMP-Karnival Masakan Melayu</option>
<option value="456">ACA CPI5 - CAMP-2018 实验教学活动</option>
<option value="457">ACA CPI6 - CAMP-华文统考复习闯关活动</option>
<option value="458">ACA CPI7 - CAMP-2018年压克力绘画工作坊</option>
<option value="459">ACA CPI8 - CAMP-《观止》师生工笔展及T恤工作坊一日营</option>
<option value="460">CCD CMO88 - 比赛-MCE National Virtual Choir and Vocal Festival 2021</option>
<option value="461">ACA CMI17 - 比赛-2018年全校华语演讲比赛</option>
<option value="462">ACA CMI18 - 比赛-全校散文创作比赛</option>
<option value="463">ACA CMI19 - 筹委-Pertandingan Forum BM</option>
<option value="464">ACA CMI20 - 比赛-Pertandingan Forum BM 2018</option>
<option value="465">ACA CMI21 - 筹委-2018 English Essay Writing Competition </option>
<option value="466">ACA CMI22 - 筹委-English Elocution Competition 2018</option>
<option value="467">ACA CMI23 - 比赛-English Elocution Competition 2018</option>
<option value="468">ACA CMI24 - 比赛-高中二、三班级制作商业广告及现场演绎比赛</option>
<option value="469">ACA CMI25 - 比赛-Pertandingan Syarahan BM Peringkat Sekolah 2018</option>
<option value="470">CCD CPI75 - CAMP - 2021年戏剧学会线上内训营《太空冒险记》</option>
<option value="471">CCD CPI76 - CAMP-ASMR 线上营会</option>
<option value="472">CCD EAI29 - 讲座 - 2021年民航飞行社讲座会《航空》</option>
<option value="473">CCD CMO89 - 比赛-2021年圣约翰校外问答比赛</option>
<option value="474">CCD CMO90 - 比赛-2021圣约翰救伤队海报绘画比赛</option>
<option value="475">CCD CMO91 - 比赛-2021Raffles Design Competition</option>
<option value="476">CCD CMO92 - 比赛-2021全国中小学征文短片制作比赛</option>
<option value="477">CCD CMO93 - 比赛-2021第四届《思华外传》中学华语网络辩论赛</option>
<option value="478">CCD CMO95 - 比赛-2021亚洲杯中文辩论锦标赛</option>
<option value="479">CCD CMI17 - 比赛-2021年挥春比赛</option>
<option value="480">CCD CMO96 - 比赛-《关怀马来西亚》短片竞赛</option>
<option value="481">CCD CMO97 - 比赛-2021《毅力杯》辩论比赛</option>
<option value="482">CCD EAO49 - 考试-Kursus Pemimpin Anugerah Remaja Perdana Rakan Muda(ARPRM)</option>
<option value="483">CCD EAO52 - 考试-Keahlian 会员徽章鉴定</option>
<option value="484">CCD EAO50 - 额外活动-2021童军团-会员卡</option>
<option value="485">CCD EAO51 - 考试-2021圆章Program Pengakap Duduk Rumah</option>
<option value="486">CCD CMO98 - 比赛-KEJOHANAN CATUR ATAS TALIAN MSSD SEREMBAN 1 (BAWAH 15&amp;18 TAHUN)</option>
<option value="487">CCD EAO53 - 考试-Jaya Diri dan Kegiatan 高级徽章鉴定</option>
<option value="488">CCD EAO54 - 额外活动-World Scout Scarf Day(Negeri Sembilan)</option>
<option value="489">CCD EAO55 - 考试-Usaha徽章鉴定</option>
<option value="490">ACA CMI26 - 比赛-2018年全校三语演讲比赛</option>
<option value="491">ACA CMI27 - 比赛-2018年全校三语演讲比赛</option>
<option value="492">ACA CMI28 - 比赛-2018年初中华文大比拼</option>
<option value="493">ACA CMI29 - 比赛-2018年绘画比赛</option>
<option value="494">ACA CMI30 - 比赛-2018年第三届高一才艺表演</option>
<option value="495">CCD CMO99 - 比赛-2021第一届《初学杯》全国辩论赛</option>
<option value="496">ACA CMO53 - 比赛-SASMO 数学比赛</option>
<option value="497">ACA CMO54 - 比赛-AMC 数学比赛</option>
<option value="498">CCD CMO100 - 比赛-2021Virtual Band Championship</option>
<option value="499">CCD EAO56 - 交流-2021芙蓉中华中学华乐团/麻坡中华中学乐团线上交流</option>
<option value="500">CCD CMO101 - 比赛-2021第二季象棋网络赛之《战略杯》</option>
<option value="501">CCD EAI30 - 考试-2021Citizenship讲座与专章考试</option>
<option value="502">CCD EAI31 - 讲座-2021年大众传播社第6次联课活动</option>
<option value="503">CCD EAO 57 - Program Lencana Perkhidmatan (Pengakap Remaja)</option>
<option value="504">CCD CMO102 - 比赛-2021SIM Essay Competiton</option>
<option value="505">ACA CMO57 - 比赛-第24届（2019年）全国征文比赛</option>
<option value="506">ACA CMO58 - 比赛-第四届《她的故事》马来西亚妇女节激励文章征选赛--森州赛</option>
<option value="507">ACA CMO59 - 比赛-第13届汉语桥世界中学生中文比赛</option>
<option value="508">ACA CMO60 - 比赛-第四届全球华语朗诵大赛</option>
<option value="509">ACA CMO62 - 比赛-第二届 厦大杯中学物理比赛</option>
<option value="510">ACA CMO61 - 比赛-2021第四届吴佳鸿杯马来西亚全国学校数学锦标赛</option>
<option value="511">ACA CMO63 - 比赛-2021 OMK 数学比赛</option>
<option value="512">ACA CMO64 - 比赛-第三届全國中學美術創作比賽</option>
<option value="513">CCD EAO58 - NATIONAL SCOUTH YOUTH LEADERSHIP FORUM 3/2021</option>
<option value="514">CCD CMO103 - MALAYSIAN COMPUTING CHALLENGE 2021</option>
<option value="515">TEST - 1</option>
<option value="516">CCD EAI32 - 讲座-2021年影音技术社第7次联课活动讲座</option>
<option value="517">CCD EAI33 - 讲座-2021年大众传播社第12、13次联课活动</option>
<option value="518">CCD CMO104 - 比赛-第一届全国协奏曲比赛</option>
<option value="519">CCD CMI18 - 比赛-2021年音乐学会内部歌唱比赛</option>
<option value="520">CCD EAI34 - 额外活动-大众传播社《大众茶水间》Podcast</option>
<option value="521">CCD PO44 - 表演-2021戏剧学会线上对外成果展</option>
<option value="522">CCD EAI35 - 考试-2021年华乐团线上考试</option>
<option value="523">CCD SI001 - 宿舍学生自治会</option>
<option value="524">CCD SI002 - 礼仪小组</option>
<option value="525">CCD SI003 - 校史小组</option>
<option value="526">CCD SI004 - 校园报报看</option>
<option value="527">CCD CMO105 - 比赛 - 2021年全球僑校學生暨僑生華語歌唱大賽</option>
<option value="528">CCD EAO59 - 书本筹备-华乐情，薪传路</option>
<option value="529">CCD CMO106 - 比赛-国油杯线上国际艺术节</option>
<option value="530">CCD CMO107 - 比赛-第三届「创意x原创Vtuber角色设计大赛」</option>
<option value="531">CCD EAO60 - 讲座-天文科普讲座(穿越时空)</option>
<option value="532">PE CMO70 - 比赛 - 2021 Kejohanan Kemahiran Sukan Merentas Desa Secara  Atas Talian MSSD Seremban 1</option>
<option value="533">PE CMO71 - 比赛 - 2021 Kejohanan Kemahiran Sukan Merentas Desa MSSNS Secara Atas Talian</option>
<option value="534">PE CMO72 - 比赛 - 2021 Pertandingan Kemahiran Sukan Olahraga Dalam Talian Peringkat MSSD Seremban 1</option>
<option value="535">PE CMO73 - 比赛 - 2021 Pertandingan Kemahiran Sukan Olahraga MSSNS Secara Dalam Talian</option>
<option value="536">PE CMO74 - 比赛 - 2021 Pertandigan Kemahiran Sukan Akuatik Dalam Talian Peringkat MSSNS</option>
<option value="537">PE CMO75 - 比赛 - 2021 Pertandingan Kemahiran Asas – Pukulan Ke Dinding Sukan Ping Pong Dalam Talian Peringkat Majlis Sukan Sekolah Daerah (MSSD) Seremban 1</option>
<option value="538">PE CMO76 - 比赛 - 2021 Pertandingan Kemaihiran Sukan Ping Pong Pukulan Ke Dinding Majlis Sukan Sekolah Negeri Sembilan (MSSNS) Secara Atas Talian Tahun</option>
<option value="539">PE CMO77 - 比赛 - 2021 Pertandingan Kemahiran Sukan Ping Pong Dalam Talian Peringkat Majlis Sukan Sekolah Daerah (MSSD) Seremban 1</option>
<option value="540">PE CMO78 - 比赛 - 2021 Pertandingan Format MSSM Ping Pong Atas Talian Majlis Sukan Sekolah Negeri Sembilan (MSSNS)</option>
<option value="541">PE CMO79 - 比赛 - 2021 Pertandingan Pukulan Forehand &amp; Backhand Berselang-Seli Ping Pong Atas Talian Majlis Sukan Sekolah Negeri Sembilan (MSSNS)</option>
<option value="542">PE CMO80 - 2021 Pertandingan Servis Pendek Sukan Ping Pong Dalam Talian Peringkat Majlis Sukan Sekolah Daerah (MSSD) Seremban 1</option>
<option value="543">ACA CMO65 - 比赛-9th HIPPO International English Olympiad </option>
<option value="544">ACA CMO66 - 比赛-《逢甲盃》2021年全国中学生正体字书法比赛</option>
<option value="545">CCD EAO61 - 研讨会-WEBINAR KONSERVASI LAUTAN TERUMBU KARANG 2021</option>
<option value="546">CCD CMO108 - 比赛-2021第二届海外华裔青少年绘画大赛</option>
<option value="547">ACA CMO67 - 比赛-Kangaroo Math Competition (KMC) 2021</option>
<option value="548">PE CMO81 - 比赛-2021 WUSHU UNION CUP</option>
<option value="549">CCD CMO109 - 比赛-2021年[丹斯里郑福成杯]全国征文比赛</option>
<option value="550">ACA CMO68 - 比赛-2021年陈景润中学数学比赛</option>
<option value="551">CCD CMO110 - 比赛-2021年孝道写作与短片创作比赛</option>
<option value="552">CCD EAO62 - 培训-从零开始学PS</option>
<option value="553">ACA CMO69 - 比赛-第38届全森中学生线上挥春比赛</option>
<option value="554">ACA CMO70 - 比赛-2021年第26届全国征文比赛</option>
<option value="555">CCD EAO63 - 考试-2021年马来西亚全国佛学考试</option>
<option value="556">CCD CPO23 - CAMP-第十九届假日营之《新星乡惜》</option>
<option value="557">CCD CMO111 - 比赛-第一届《黄天星杯》书法大赛</option>
<option value="558">CCD CMO112 - 比赛-MALAYSIA TOP 10 OUTSTANDING YOUNG ARTISTS AWARDS 2021</option>
<option value="559">CCD EAO64 - 讲座-CULINARY,PASTRY &amp; CHINESE CUISINE</option>
<option value="560">CCD CMO113 - 比赛-台大杯全国中学生程式设计竞赛</option>
<option value="561">CCD CMO114 - 比赛-2021年文化中国.海外华裔青少年中华文化大赛</option>
<option value="562">CCD CMO115 - 比赛-2021年孝道格言线上书法比赛</option>
<option value="563">CCD CMO116 - 比赛-2021年星洲日报中学生时事问答比赛</option>
<option value="564">CCD CMO117 - 比赛-2021年中学生T恤设计比赛</option>
<option value="565">CCD EAO65 - 培训-CREATING A WEBSITE:A BEGINNER&#039;S WORKSHOP</option>
<option value="566">CCD CMO118 - 比赛-AMORASMATH KSSM Mathematics Competition</option>
<option value="567">CCD EAO66 - 培训-BE SAFE ONLINE</option>
<option value="568">CCD EAO67 - 研讨会-WEBINAR:BERSATU DALAM KEPELBAGAIAN ATNOASTRONOMI DI MALAYSIA</option>
<option value="569">CCD EAO77 - 考试-EKUINOKS SEPTEMBER</option>
<option value="570">CCD EAO68 - 研讨会-FORUM WEBINAR KEMPEN KESEDARAN &amp; USAHA MENJAGA ALAM SEKITAR</option>
<option value="571">CCD CMO120 - 比赛-2021 TIME 2 FIT 2.0 VIRTUAL RUN &amp; RIDE</option>
<option value="572">CCD CMO121 - 比赛-FMG RG CUP 1, 2021</option>
<option value="573">CCD CMO122 - 比赛-2021 GLOBAL RUNNING DAY</option>
<option value="574">CCD CMO123 - 比赛-2021 INTERNATIONAL OPEN/INVITATIONAL ITF E-TUL CHAMPIONSHIP</option>
<option value="575">CCD EAO69 - 培训-JAMBOREE ON THE INTERNET JOTA-JOTI 2021</option>
<option value="576">CCD CMO124 - 比赛-KEJOHANAN WUSHU ONLINE PERINGKAT KEBANGSAAN 2021</option>
<option value="577">CCD EAO70 - 研讨会-ORIENTEERING LEVEL 0.1 WEBINAR</option>
<option value="578">CCD CMO125 - 比赛-2021 MALAYSIAN PIANO COMPETITION</option>
<option value="579">CCD CMO126 - 比赛-2021 ONLINE UKULELE SOLO COMPETITION INTERNATIONAL LEVEL</option>
<option value="580">CCD CMO127 - 比赛-MALAYSIA SCOUT VIRTUAL RUN PERINGKAT KEBANGSAAN 2021</option>
<option value="581">CCD CMO128 - 比赛-2021 MIA YOUNG MUSICIAN COMPETITION (ONLINE)</option>
<option value="582">CCD EAO71 - 研讨会-2021 OCEAN CONSERVATION WEBINAR SERIES</option>
<option value="583">ACA CMO71 - 比赛-2021 PERTANDINGAN SUARA HARMONI MAYA</option>
<option value="584">CCD CMO129 - 比赛-2021 PERTANDINGAN WUSHU REMAJA KEBANGSAAN (ONLINE)</option>
<option value="585">CCD CMO130 - 比赛-2021 PHILIPPINE INTERNATIONAL MATHEMATICAL OLYMPIAD</option>
<option value="586">CCD CMO131 - 比赛-2021 PRIDE TRAIL BLAZER</option>
<option value="587">ACA CMO72 - 比赛-SASMO 数学比赛</option>
<option value="588">CCD CMO132 - 比赛-2021 SDG VIRTUAL HEALTH CHALLENGE PERINGKAT KEBANGSAAN</option>
<option value="589">CCD CPO24 - CAMP-2021 SUNWAY AMBASSADOR LEADERSHIP TREK</option>
<option value="590">ACA CMO73 - 比赛-Sunway-Oxbridge Essay Competition 2021</option>
<option value="591">CCD CMO133 - 比赛-Taekwon-Do Super Warrior Championship 2021</option>
<option value="592">CCD CMO134 - 比赛-Virtual IMU Science Discovery Challenge 2021</option>
<option value="593">CCD EAO72 - 考试-2021 WORLD  CAR FREE DAY</option>
<option value="594">CCD EAO73 - 考试-2021 WORLD GORILLA DAY</option>
<option value="595">CCD EAO74 - 考试-WORLD RHINO DAY</option>
<option value="596">CCD EAO75 - 考试-WORLD RIVER RUN</option>
<option value="597">CCD CMO135 - 比赛-WSSA 2020-2021 NS&amp;MELAKA ONLINE STACKING COMPETITION SERIES</option>
<option value="598">CCD CMO119 - 比赛-WSSA 2021 Malaysia Open Sport Stacking Championships</option>
<option value="599">CCD EAO76 - 考试-ZERO EMISSIONS DAY</option>
<option value="600">CCD PO45 - 表演 - 2021第七届马来西亚关公文化节</option>
<option value="601">CCD EAO78 - KLPF2021-《青少年摄影展》</option>
<option value="602">CCD EAO79 - KLPF2021-《青少年摄影线上摄影分享会》</option>
<option value="603">CCD CMO136 - AMO 奥数比赛</option>
<option value="604">CCD CPI77 - CMAP-2021戏剧学会线上团康</option>
<option value="605">CCD SI3 - 服务-第46届初中统考成绩优越颁奖礼</option>
<option value="606">CCD CMO2 - 比赛-2020 Kejohanan Catur Terbuka</option>
<option value="607">CCD CPO25 - CAMP-2019年圣约翰救伤队专章考试营</option>
<option value="608">CCD CMI19 - 2021校内中国象棋和西洋棋比赛</option>
<option value="609">CCD EAI36 - 额外活动-2020戏剧学会线上叙别会</option>
<option value="610">CCD CMO137 - 比赛-Maestro Muda Talentime 2021</option>
<option value="611">CCD CMO138 - NEGERI SEMBILAN INTER-CLUB(NSIC) SWIMMING CHAMPIONSHIPS 2022</option>
<option value="612">PE CMO82 - 2020年学联排球赛（县赛）</option>
<option value="613">CCD PI1 - 表演-抗疫 </option>
<option value="614">CCD CMO139 - 比赛-上文化 摄影比赛</option>
<option value="615">CCD CPI79 - CAMP-2022戏剧学会新生营《百变新探》</option>
<option value="616">CCD CPI80 - CAMP-2022辩论社迎新营《以辨迎新》</option>
<option value="617">CCD CMI20 - 比赛-2022年挥春比赛</option>
<option value="618">CCD EAI39 - 欢送-2022廿四节令鼓对线上叙别会</option>
<option value="619">CCD CPI78 - CAMP- 2022年管乐团训练营及新生交流营</option>
<option value="620">CCD CPI81 - CAMP-2022年6月份华乐新生营暨集训营</option>
<option value="621">CCD CPO26 - CAMP - Malaysia Future Leaders School 2022 Kohort 4</option>
<option value="622">ACA CMO74 - 4月份画作征稿，经典诗集，手绘插图</option>
<option value="623">CCD CMO14 - 比赛-2021全国中小学生网络象棋个人赛</option>
<option value="624">CCD CMO140 - 比赛 - 第三届全国母亲节颂文比赛</option>
<option value="625">CCD CMO141 - 比赛 - Dog Show Compeition 2022</option>
<option value="626">CCD CMO142 - 比赛 - 第六届香港青少年盃国际音乐比赛</option>
<option value="627">CCD CMO143 - 比赛 -“期待美好明天”中马青年摄影大赛 2022</option>
<option value="628">CCD CMO144 - 比赛 - 舞狮比赛（张念群杯）2022</option>
<option value="629">CCD CMO145 - 比赛 - 第九屆香港國際青少年表演藝術節The 9th Hong Kong International Youth Performance Arts Festival(HKYPAF)</option>
<option value="630">CCD CMO146 - 比赛 - 男女15岁及以下 青少年篮球锦标赛（女子组）2022</option>
<option value="631">CCD CMO147 - 比赛 - 2022 Malaysia Olympiad on Astronomy and Astrophysics (MOAA) Online Pre-Selection Test 2022年马来西亚天文学和天体物理学奥林匹克竞赛线上预选测验</option>
<option value="632">CCD CMO148 - 比赛 - 泰莱大学独中校友会2022年才艺比赛</option>
<option value="633">CCD CMO149 - 比赛- 青春之歌，自信唱响 2022</option>
<option value="634">CCD CMO150 - 比赛 - Eurasian Spelling Bee 2022</option>
<option value="635">CCD CMO151 - 比赛 - Hopes Cup 2022</option>
<option value="636">CCD CMO152 - 比赛 - 《第五届全球华语朗诵大赛》</option>
<option value="637">CCD CMO153 - 比赛 -《逢甲盃》全国中学生正体字书法比赛 2021</option>
<option value="638">CCD CMO154 - 比赛 - 第6届“孝悌立根基”孝道格言书法比赛</option>
<option value="639">CCD CMO155 - 比赛 - Team 剧团</option>
<option value="640">CCD CMO156 - 比赛 - NEPTUNE SERIES 2 MALAYSIA NATIONAL OPEN WATER SWIMMING CHAMPIONSHIP 2022</option>
<option value="641">CCD CMO157 - 比赛 - PERTANDINGAN MEWARNA</option>
<option value="642">CCD CMO158 - 比赛 - KEJOHANAN WUSHU &#039;PERINGKAT NEGERI&#039; NEGERI SEMBILAN 2022</option>
<option value="643">CCD CMO159 - 比赛 - WSSA 2022 MesaMall Sport Stacking Championships</option>
<option value="644">CCD CMO160 - 比赛 - WSSA 2022 DPulze Open Sport Stacking Championships</option>
<option value="645">CCD CMO161 - 比赛 - 1st Selangor Invitational Age Group Artistic Swimming Championship 2022</option>
<option value="646">CCD CMO162 - 比赛 - Kejohanan Wushu Pra Sukma Jemputan Kebangsaan 2022</option>
<option value="647">CCD CMO163 - 比赛 - AMA 2022 Peringkat Negeri Sembilan Pertandingan Wushu</option>
<option value="648">CCD CPO27 - CAMP - Tomorrow&#039;s Young Business Leaders</option>
<option value="649">CCD CPO28 - CAMP - 全中华16线上生活营</option>
<option value="650">CCD CPO29 - CAMP - 森州第三十六届学记培训营</option>
<option value="651">CCD CPO30 - CAMP - 湖南师大2022年线上中华文化大乐园亚洲园第九期</option>
<option value="652">ACA CMO75 - 2022 第九届理大文学奖</option>
<option value="653">ACA CMO76 - 2022 SASMO数学比赛</option>
<option value="654">ACA CMO77 - 第6届“孝悌立根基”孝道格言线上书法比赛</option>
<option value="655">ACA CMO78 - 2022年5月份画作征稿，主题：劳动者</option>
<option value="656">ACA CMO79 - 2022 Eurasian Spelling Bee（online）</option>
<option value="657">ACA CMO80 - 第三届（2022年度）全国母亲节颂文比赛（森州芙蓉区）</option>
<option value="658">ACA CMO81 - 2022 环保袋设计</option>
<option value="659">ACA CMO82 - 10Th Kangroo Math Competition （Kangroo）2022</option>
<option value="660">ACA CMO85 - 比赛 - 2022年美院繁星书画</option>
<option value="661">ACA CMO86 - 比赛 - 《中学生》美术专栏</option>
<option value="662">ACA CMO90 - 比赛 - 汉语桥</option>
<option value="663">ACA CMO91 - 比赛 - 第37届成大数理比赛</option>
<option value="664">ACA CMO92 - 比赛 - 第30届全国华文独中国文论坛C区交流会</option>
<option value="665">ACA CMO89 - 比赛 - MCISS大马华文独中线上英语辩论赛2022</option>
<option value="666">CCD SI4 - 服务-2022破伤风疫苗</option>
<option value="667">ACA CMO88 - 2022年星洲日报中学生时事问答比赛</option>
<option value="668">ACA CMO87 - 第40届（2022年）全球华文学生文学奖</option>
<option value="669">CCD EAO80 - 吊丧-前校长李素鸾董事长夫人举殡仪式</option>
<option value="670">CCD CPO31 - CAMP - Malaysia Future Leaders School 2022 Kohort 8</option>
<option value="671">CCD CPO32 - CAMP - Malaysia Future Leaders School 2022 Kohort 12</option>
<option value="672">ACA CMO94 - 比赛 - 2022 English Debate Training&amp;Competition</option>
<option value="673">ACA CMO83 - 比赛 - 2022 吴佳鸿数学比赛</option>
<option value="674">CCD CMO164 - 比赛 - NS SCOUT E-SPORTS CHALLENGE 2022</option>
<option value="675">CCD EAO81 - 课程 - 无人机</option>
<option value="676">CCD CPI82 - CAMP - 管乐团9月假期训练营</option>
<option value="677">CCD EAO82 - 额外活动 - 曾敏兴老先生出殡仪式</option>
<option value="678">CCD PO46 - Operasi Khidmat Masyarakat Moral 2022</option>
<option value="679">CCD EAO83 - 额外活动 - 全国华人文化节 火炬行</option>
<option value="680">CCD SO6 - 服务 - 全国华人文化节 文化村义工</option>
<option value="681">CCD PO47 - 表演 - 全国华人文化节 开幕表演</option>
<option value="682">CCD PO48 - 表演 - 全国华人文化节 闭幕表演</option>
<option value="683">CCD SO7 - 服务 - 全国华人文化节 开闭幕义工</option>
<option value="684">CCD SO8 - 服务 - 全国华人文化节 火炬行义工</option>
<option value="685">CCD CPO33 - CAMP-2020年Sunway独中领袖培训营</option>
<option value="686">CCD PI2 - 表演-2019年教师节</option>
<option value="687">CCD PI3 - 表演-2022年线上校庆</option>
<option value="688">CCD PI4 - 表演-2018年新春大团拜</option>
<option value="689">CCD EAI40 - 额外活动-2019年教师节</option>
<option value="690">CCD EAI41 - 额外活动-2019年学会招生展</option>
<option value="691">CCD EAI42 - 额外活动-2019年新春大团拜</option>
<option value="692">CCD CPI86 - CAMP-2018年主席营</option>
<option value="693">CCD EAI44 - 额外活动-2018年社团成果展</option>
<option value="694">CCD PO49 - 表演-2018年《寻乐 启梦》波中华乐团演奏会</option>
<option value="695">CCD CPO34 - CAMP-2018年《深波远颺》深中波中芙中三校交流营</option>
<option value="696">CCD CPI83 - CAMP-2018年3月份华乐迎新营暨集训营</option>
<option value="697">CCD PO50 - 表演-副董事长就职典礼</option>
<option value="698">CCD PI5 - 表演 - 2022年教师节</option>
<option value="699">CCD SI5 - 服务 - 2022年教师节</option>
<option value="700">CCD PO51 - 表演-Lodge Nanyang Installation Meeting</option>
<option value="701">CCD PO52 - 表演-Mid-Autumn Lantern Festival</option>
<option value="702">CCD EAO84 - 额外活动 - Program Lencana Ekspedisi Persekutuan Pengakap Malaysia N.S. 2022</option>
<option value="703">CCD EAO85 - 额外活动 - 戏剧学会校外观摩</option>
<option value="704">CCD PO53 - 表演-贺岁MV拍摄</option>
<option value="705">CCD EAI45 - 额外活动 - 英文学会 Tea Party</option>
<option value="706">CCD PO54 - 表演-中国国庆庆典</option>
<option value="707">CCD SI6 - 服务 - 洗车服务2022</option>
<option value="708">CCD EAI46 - 额外活动 - &lt;悦读百籍&gt;第二梯次</option>
<option value="709">CCD EAI47 - 额外活动 - &quot;校园觅案&quot;</option>
<option value="710">CCD EAO86 - 额外活动 - 史地学会户外一日游</option>
<option value="711">CCD CPI84 - CAMP-2022年9月份音乐《馨声》生活营</option>
<option value="712">CCD CMI21 - 比赛 - 2022年全校班级篮球赛&amp;全明星赛</option>
<option value="713">CCD CMI22 - 比赛-2022年全校文艺歌曲及校园民歌歌唱比赛</option>
<option value="714">CCD EAO87 - 额外活动 -园艺学会参观草药园</option>
<option value="715">CCD EAI48 - 额外活动-售卖班级照及学会照</option>
<option value="716">CCD EAI49 - 额外活动-升级检阅礼</option>
<option value="717">CCD CMI23 - 比赛-2022年Infinity摄影比赛</option>
<option value="718">CCD EAI50 - 额外活动-“诡校谜案”线上侦探活动</option>
<option value="719">CCD CPI85 - CAMP-2022年6月份廿四节令鼓队新生营</option>
<option value="720">CCD EAO88 - 额外活动 - 2022年KLPF吉隆坡摄影节</option>
<option value="721">CCD EAO89 - 额外活动 - 岁月留影2022摄影展</option>
<option value="722">CCD CMO165 - 比赛 - PERTANDINGAN SUARA HARMONI MAYA</option>
<option value="723">CCD CMO166 - 比赛-2022年华总国油杯国际艺术节</option>
<option value="724">CCD SO9 - 服务-全国华人文化节 大游行</option>
<option value="725">CCD EAO90 - 额外活动-全国华人文化节 大游行</option>
<option value="726">CCD PO55 - 表演-全国华人文化节文化节 大游行</option>
<option value="727">CCD CMO167 - 111年全球僑校学生暨僑生歌唱大赛</option>
<option value="728">CCD CMO168 - 2022全国中学生程式竞赛</option>
<option value="729">CCD CMO169 - 2022全国学艺比赛第三十一届硬笔书法赛</option>
<option value="730">CCD CMO170 - 2022雪邦篮协篮球联赛</option>
<option value="731">CCD CMO171 - 6th Steinway Malaysia Youth Picro Competition</option>
<option value="732">CCD CMO172 - 8th IMU Virtual Science Discovery Challenge 2022</option>
<option value="733">CCD CMO173 - Bola Keranjang 3x3 Peringkat Daerah Seremban</option>
<option value="734">CCD CMO174 - International Parents Day 18th Online Competition 2022</option>
<option value="735">CCD CMO175 - Latin Amateur Rising Star</option>
<option value="736">CCD CMO176 - Latin Beginner Couple 17 CCC</option>
<option value="737">CCD CMO177 - Latin Beginner Couple 17 Jive</option>
<option value="738">CCD CMO178 - Latin Beginner Couple 17 Rumba</option>
<option value="739">CCD CMO179 - Latin Beginner Couple 17 Samba</option>
<option value="740">CCD CMO180 - Latin Beginner Open Cha</option>
<option value="741">CCD CMO181 - Latin Beginner Open Jive</option>
<option value="742">CCD CMO182 - Latin Beginner Open Rumba</option>
<option value="743">CCD CMO183 - Latin Beginner Open Samba</option>
<option value="744">CCD CMO184 - Latin Beginner under 16 Cha</option>
<option value="745">CCD CMO185 - Latin Beginner under 16 Jive</option>
<option value="746">CCD CMO186 - Latin Beginner under 16 Rumba</option>
<option value="747">CCD CMO187 - Latin Beginner under 16 Samba</option>
<option value="748">CCD CMO188 - Latin Couple Beginner Open Cha</option>
<option value="749">CCD CMO189 - Latin Couple Beginner Open Jive</option>
<option value="750">CCD CMO190 - Latin Couple Beginner Open Rumba</option>
<option value="751">CCD CMO191 - Latin Couple Beginner Open Samba</option>
<option value="752">CCD CMO192 - Latin Couple Junior Couple Under 16</option>
<option value="753">CCD CMO193 - Latin Couple Novice I</option>
<option value="754">CCD CMO194 - Latin Couple Novice II</option>
<option value="755">CCD CMO195 - Latin Couple Pre-Amateur</option>
<option value="756">CCD CMO196 - Latin Junior Under 16</option>
<option value="757">CCD CMO197 - Latin Novice </option>
<option value="758">CCD CMO198 - Latin Novice I</option>
<option value="759">CCD CMO199 - Latin Novice II</option>
<option value="760">CCD CMO200 - Latin Pre-Amateur</option>
<option value="761">CCD CMO201 - Latin Solo Open Secondary School</option>
<option value="762">CCD CMO202 - Latin Youth under 21</option>
<option value="763">CCD CMO203 - Malaysia Invitation Age Group Artistic Swimming Championship 2022</option>
<option value="764">CCD CMO204 - Mid-Autumn Festival Drawing Contest 2022</option>
<option value="765">CCD CMO205 - Peace Poster Contest Lead with Compassion</option>
<option value="766">CCD CMO206 - Pertandingan Mewarna</option>
<option value="767">CCD CMO207 - Solo Medalist Secondary School(W)</option>
<option value="768">CCD CMO208 - Standard Beginner Couple Open Waltz</option>
<option value="769">CCDCMO209 - Standard Beginner Couple under 17 Quitstep</option>
<option value="770">CCD CMO210 - Standard Beginner Couple under 17 Waltz</option>
<option value="771">CCD CMO211 - Standard Beginner Open Quitstep</option>
<option value="772">CCD CMO212 - Standard Beginner Open Waltz</option>
<option value="773">CCD CMO213 - Standard Beginner under 16 Quitstep</option>
<option value="774">CCD CMO214 - Standard Beginner under 16 Waltz</option>
<option value="775">CCD CMO215 - WSSA 2022 Malaysia Open Sport Stacking Championship</option>
<option value="776">CCD CMO216 - WSSA 2022Paradigm Mall Sport Stacking Challenge</option>
<option value="777">CCD CMO217 - 全国书画创作征集</option>
<option value="778">CCD CMO218 - 国庆日填色比赛</option>
<option value="779">CCD CMO219 - 第一届雪隆森独中初中华语辩论赛</option>
<option value="780">CCD CPO35 - 肌饿30 2022</option>
<option value="781">CCD CMO209 - 比赛 - 第一届凛然正气杯全国硬笔书法赛</option>
<option value="782">CCD CMO220 - 比赛 - PTC&#039;22 8th Putrajaya Taekwondo Challenge Plank Breaking CB&amp;BB Combine Male under 15</option>
<option value="783">CCD EAI51 - 额外活动-J.U.联办活动</option>
<option value="784">CCD EAO91 - 主持-华文独中线上音乐及体育表演会</option>
<option value="785">CCD SO10 - 服务-Operasi Khidmat Masyarakat Moral 2022(下乡服务)</option>
<option value="786">CCD SO11 - 服务-辩论海啸之花城舌战</option>
<option value="787">CCD EAO92 - 额外活动-辩论海啸之花城舌战</option>
<option value="788">CCD CPI87 - CAMP-2022年9月份华乐团文化节表演集训营</option>
<option value="789">CCD EAO93 - 讲座-环球餐饮厨艺讲座会</option>
<option value="790">CCD EAI52 - 额外活动-《超月时空》超级月亮观测活动</option>
<option value="791">CCD EAO94 - 见习-Jementah天文馆见习</option>
<option value="792">CCD CPO36 - CAMP-2022 SUNWAY SALT LEADERSHIP CAMP</option>
<option value="793">CCD EAI53 - 额外活动-S.U.联办活动</option>
<option value="794">CCD CPI88 - CAMP - 扯铃文化节训练营</option>
<option value="795">CCD CPI89 - CAMP - 全国华人文化节舞蹈训练营</option>
<option value="796">CCD EAI54 - 考试-专章考试</option>
<option value="797">CCD CMI24 - 比赛 - 2022年不插电比赛</option>
<option value="798">ACA CMO84 - 比赛 - 2022陈景润数学</option>
<option value="799">ACA CMO98 - 比赛 - 2022国际医药大学IMU线上科学探索挑战				</option>
<option value="800">ACA CMO96 - 比赛 - 2022年第2届雪隆森独中英语论论坛比赛</option>
<option value="801">ACA CMO95 - 比赛 - 留台联总第四届全国中学美术创作比赛</option>
<option value="802">ACA CMO97 - MCL Land Forest Heights 中秋节庆典文化推广</option>
<option value="803">ACA CMO93 - 比赛 - 第3届厦大杯中学物理比赛</option>
<option value="804">CCD CMO221 - 比赛 -  2022年第24届福联青全国中学华语辩论比赛</option>
<option value="805">CCD SO12 - 义工-Perpaduaan Muhibbah Creative &amp; Craftart</option>
<option value="806">CCD PO56 - 表演-2022亚洲童星国际中小学生电视展演盛典-央电视</option>
<option value="807">CCD CMI25 - 比赛-2022年全校班级羽球比赛</option>
<option value="808">ACA CMO99 - 比赛 - 第二届国际中学生陈嘉庚常识</option>
<option value="809">CCD SI7 - 2022年师生作品展</option>
<option value="810">CCD SI8 - 2022年感恩聚会</option>
<option value="811">CCD CMO222 - 比赛-2022 Ingress Auto Joy Run</option>
<option value="812">CCD CMO223 - 比赛-broga fun run kg baru 2022</option>
<option value="813">CCD CMO224 - 比赛 -《逢甲盃》全国中学生正体字书法比赛 2022</option>
<option value="814">CCD CMO225 - euroasia strings competition 2022</option>
<option value="815">CCD CMO226 - 比赛-2022 Dpulze qualifier sport stacking championships</option>
<option value="816">CCD CMO227 - 比赛 - 2022 Malaysia Olympiad on Astronomy and Astrophysics</option>
<option value="817">CCD CMO228 - 比赛 - 第37届全国华人文化节全森州书法比赛</option>
<option value="818">CCD CMO229 - 比赛-2022 PERTANDINGAN WUSHU REMAJA KEBANGSAAN (ONLINE)</option>
<option value="819">CCD CMO230 - 比赛 - 2022第八届马来西亚关公文化节森美兰州全国书法比赛</option>
<option value="820">CCD CMO231 - 6th PRAKL Age Group Invitational Water Polo 2022</option>
<option value="821">CCD CMO232 - 国际线上数学比赛精英公开赛2022</option>
<option value="822">CCD CMO233 - 比赛-2022Malaysian Computing Challenge </option>
<option value="823">CCD CPO37 - CAMP-Virtual Web-Design Summer Camp 2022</option>
<option value="824">CCD CPO38 - 和平团契2022少年营</option>
<option value="825">CCD CPO39 - 第18届雪隆年少情《忆号玩家》全国生活营</option>
<option value="826">CCD CMO234 - 比赛-2022年颜真卿杯全国书法比赛</option>
<option value="827">CCD CMO235 - 比赛-2022年第八届海外华裔青少年中华文化大赛-知识竞赛</option>
<option value="828">CCD EAO95 - 讲座-为什么要投票讲座会</option>
<option value="829">CCD CMO236 - 比赛-held university mciss onlie english debate competition 2022</option>
<option value="830">CCD CMO237 - 比赛-Malaysia Sejiwa Pandai Colouring Contest 2022</option>
<option value="831">CCD CMO238 - 比赛-2022 lions international peace poster poster contest</option>
<option value="832">CCD CMO239 - 比赛-kejohanan renang bakat podium negeri sembilan yang ke-2</option>
<option value="833">CCD CMO240 - 比赛-HELP University Asian Secondary School Online English Debate Challenge 2022</option>
<option value="834">CCD CMO241 - Malaysia Young Author Award 2022</option>
<option value="835">CCD CMO242 - 比赛-eurasian spelling bee lexical skills competition 2022</option>
<option value="836">CCD CPO40 - CAMP-MeWe Camps</option>
<option value="837">CCD EAO96 - 额外活动-sunway ambassador leadership trek</option>
<option value="838">CCD CMO243 - 比赛-HELP University Chinese Independent School Online English Debate Challenge 2022</option>
<option value="839">CCD CMO244 - 比赛-2022年森美兰华语诗歌朗诵比赛</option>
<option value="840">CCD EAO97 - 考试-2022年跆拳道考试</option>
<option value="841">CCD CMO245 - Young Writer&#039;s Meet essay writing competition 2022</option>
<option value="842">CCD PI6 - 表演 - 迎宾中国大使</option>
<option value="843">PE CMO89 - 2022 MSSD Badminton</option>
<option value="844">PE CMO90 - 2022 MSSNS Badminton</option>
<option value="845">PE CMO93 - 2022 Badminton Pressident Cup</option>
<option value="846">PE CMO95 - 2022 MSSNS Bola Tampar</option>
<option value="847">PE CMO96 - 2022 MSSM Skuasy </option>
<option value="848">PE CMO97 - 2022 Mah Kai Leng Badminton Championship</option>
<option value="849">PE CMO94 - 2022 MSSNS Bola Keranjang </option>
<option value="850">PE CMO83 - 2022 Kejohanan 100Plus Junior Elite Tour(1ST LEG) Group B</option>
<option value="851">PE CMO84 - 2022 57TH Milo/Pram Malaysia Invitational Age Group Swimming Competition 2022</option>
<option value="852">PE CMO86 - Sportexcel/Milo/NSC/Mas Junior Swimming Circuit - 2ND LEG 2022</option>
<option value="853">PE CMO87 - Kejohanan Golf Majlis Sukan Sekolah Negri Sembilan 2022 MSSNS</option>
<option value="854">PE CMO92 - 2022 MSSNS游泳学联</option>
<option value="855">PE CMO91 - 2022 MSSD排球学联</option>
<option value="856">PE CMO88 - 2022年芙蓉县男女十七岁及以下青少年篮球锦标赛</option>
<option value="857">PE CMO85 - 2022年芙蓉分会男女15岁及以下青少年篮球锦标赛</option>
<option value="858">PE CMO98 - Lum Mun Chak Cup Basketball Championship 2022</option>
<option value="859">PE CMO99 - 2022 MSSM Badminton </option>
<option value="860">PE CMO100 - 2022 MSSM Bola Keranjang </option>
<option value="861">PE CMO101 - 2022 MSSM Kejohanan Olahraga </option>
<option value="862">ACA CMO100 - 侨委员会2022年全球侨校生作文比赛</option>
<option value="863">ACA CMO102 - 2022第十三届全国中学正体字逢甲杯</option>
<option value="864">ACA CMO103 - Australian Mathematics Competition 2022</option>
<option value="865">ACA CMO104 - 2022 National Mathematics Olympaid Competition(OMK)</option>
<option value="866">ACA CMO101 - K3M，Kuiz Kimia Kebangsaan Malaysia 2022</option>
<option value="867">CCD PO57 - 表演-万花鼓宴6</option>
<option value="868">CCD PO58 - 表演-Astro《就是爱欢喜》节目拍摄</option>
<option value="869">CCD EAI55 - 额外活动-2020售卖班级照及学会照</option>
<option value="870">CCD EAO98 - 额外活动 - Majlis Penyampaian Anugerah Rambu Persekutuan Pengakap Malaysia Daerah Seremban</option>
<option value="871">CCD EAO99 - 额外活动 - 图书馆服务团外出</option>
<option value="872">CCD EAI56 - 额外活动 - 廿四节令鼓队2022年高三欢送会</option>
<option value="873">CCD CPI90 - CAMP - 2022年廿四节令鼓队新春营</option>
<option value="874">CCD CPO41 - CAMP-管乐团2022年12月麻坡中化中学交流营</option>
<option value="875">CCD EAI57 - 额外活动 - 2022年第37届戏剧学会线上叙别会</option>
<option value="876">CCD CPI91 - CAMP-2022年廿四节令鼓队比赛训练营</option>
<option value="877">CCD CPI92 - CAMP - 管乐团2022年12月集训营及交流营</option>
<option value="878">CCD PO59 - 表演- 2023芙蓉文化街群兔跃花城新春嘉年华</option>
<option value="879">CCD PO60 - 2023 表演-Majlis Santapan Negeri Sampena Hari Keputeraan Ke-75 DYMM Yang di-Pertuan Besar NS</option>
<option value="880">CCD PO61 - 表演- 2023年新春大团拜</option>
<option value="881">CCD PO62 - 表演- 森州福州会馆70周年纪念</option>
<option value="882">CCD PO63 - 表演-全国福联会团拜</option>
<option value="883">CCD PO64 - 表演- 2023新年演出</option>
<option value="884">CCD PO66 - 表演-Nice兔Meet You【2023年元宵节美食嘉年华】</option>
<option value="885">CCD PO65 - 表演-Majlis Rumah Terbuka Tahun Baru Cina 2023</option>
<option value="886">CCD SO15 - 服务 - 租借节令鼓</option>
<option value="887">CCD EAO101 - 额外活动-2023年童军团一日游</option>
<option value="888">CCD SO14 - 服务-第二届马来西亚客家文化节</option>
<option value="889">CCD CPO42 - CAMP-STATE CADET CAMP N.S</option>
<option value="890">CCD CPI93 - CAMP-2023年芙蓉中华中学戏剧学会新生营《维尔多学院之航海日志》</option>
<option value="891">CCD CPI94 - CAMP-2023年廿四节令鼓队《彼岸》集训营</option>
<option value="892">CCD CPI95 - CAMP - 2023年管乐团《4月份集训营及新生营》</option>
<option value="893">CCD CPI96 - CAMP-2023年管乐团6月份训练营</option>
<option value="894">CCD SI9 - 服务 - 2023年社会服务团洗车服务</option>
<option value="895">CCD EAO103 - 额外活动-邱連辉老先生出殡仪式</option>
<option value="896">CCD EAO104 - Pekan Nanas天文推广活动</option>
<option value="897">CCD CMO246 - 高学杯全国中学辩论赛</option>
<option value="898">CCD CMO247 - Malaysia Culinary World Cup</option>
<option value="899">CCD CMO248 - Peraduan Melukis Poster Peringkat Kebangsaan</option>
<option value="900">ccd cmo249 - 全国中学生华语辩论赛</option>
<option value="901">CCD CPO43 - MOAA CAMP 2023</option>
<option value="902">CCD CPI97 - CAMP-2023年华乐团6月训练营</option>
<option value="903">CCD CPI98 - CAMP-辩论社4月新生营</option>
<option value="904">CCD CPI99 - CAMP-2022年华乐团12月训练营</option>
<option value="905">CCD EAI58 - 额外活动-2023新春红包主题展览设计</option>
<option value="906">CCD CMO250 - 比赛- S2 摄影比赛</option>
<option value="907">CCD EAO105 - 额外活动- 《万宝玉兔气扬眉》迎春画展</option>
<option value="908">CCD EAO106 - 额外活动-音乐学会 《校外观摩》</option>
<option value="909">CCD CPI100 - CAMP-2023年音乐学会 《音缘》生活营</option>
<option value="910">CCD CPI101 - CAMP-2023 舞蹈学会 《起舞》生活营</option>
<option value="911">CCD CPI102 - CAMP-2023 吉他社《弦动心声》生活营</option>
<option value="912">CCD CPO44 - CAMP-2023 SUNWAY LEADERSHIP CAMP</option>
<option value="913">CCD CMO251 - 比赛-《永远的照亮》合唱比赛-决赛</option>
<option value="914">CCD CPI103 - CAMP - 2023年廿四节令鼓队集训营</option>
<option value="915">CCD CMI26 - 比赛-2023年教职员联谊会《师生羽乒联谊赛》</option>
<option value="916">CCD CPO45 - CAMP-Malaysia Future Leaders School 2023</option>
<option value="917">CCD CMO252 - 比赛 - Kejohanan Catur SM MSSD S1 2023</option>
<option value="918">CCD CMI27 - 比赛-2023年街舞社《舞动精彩 炫出自我》</option>
<option value="919">CCD PI7 - 表演-2023年教师节庆典《燃烛·亮心》</option>
<option value="920">CCD SI10 - 服务-2023年教师节庆典《燃烛·亮心》</option>
<option value="921">CCD SI11 - 服务 - 2023年全国独中科学营</option>
<option value="922">CCD CPI104 - CAMP-2023年 音乐学会《续梦》</option>
<option value="923">CCD CMO253 - 比赛-《永恒的传承》摄影比赛</option>
<option value="924">CCD EAO107 - 额外活动-MRC International Talent Competition</option>
<option value="925">CCD EAO108 - 额外活动-八度空间（八八六十事）8TV 8-news-“八八小主持 走进校园”Youth Hosts</option>
<option value="926">CCD CMI28 - 比赛-2023年电脑学会《教师节电竞活动》</option>
<option value="927">CCD CMO254 - 比赛-【2023第十届香港国际音乐节】-马来西亚初赛</option>
<option value="928">CCD CMO255 - 比赛-【2023第十届香港国际音乐节】-香港总决赛</option>
<option value="929">CCD EAO109 - 额外活动-摄影学会《芙蓉皇家山户外猎影》</option>
<option value="930">CCD EAO110 - 额外活动-2023年摄影学会KLPF 吉隆坡摄影节</option>
<option value="931">CCD CMO256 - 比赛-波德申中华中学-【摄影从0开始】</option>
<option value="932">CCD PI8 - 表演-2023年芙蓉中华中小学110校庆晚宴</option>
<option value="933">CCD CPI105 - CAMP-2023年厨艺社《炊·梦》</option>
<option value="934">CCD SI12 - 服务-2023年芙蓉中华中小学110校庆晚宴</option>
<option value="935">CCD CMO257 - 比赛-2023年全国独中跆拳道锦标赛</option>
<option value="936">CCD EAO111 - 额外活动-2023 公益植树活动</option>
<option value="937">CCD CMO258 - 比赛-2023年第19届马来西亚中学生戏聚比赛</option>
<option value="938">CCD SI13 - 服务 - 希望的种子与行动展览</option>
<option value="939">CCD EAO112 - 额外活动-2023 公益植树活动</option>
<option value="940">CCD CMO259 - 比赛-2023年度全森中小学华语文艺歌唱比赛</option>
<option value="941">CCD EAO113 - 额外活动-2023年英文学会《Learning with ELS》</option>
<option value="942">ACA CMO105 - 比赛 -《寸草心19》双亲全国征文</option>
<option value="943">ACA CMO106 - 比赛 - 第39届全森中小学挥春观摩赛</option>
<option value="944">ACA CMO107 - 比赛 - 11th HIPPO International English Olympiad</option>
<option value="945">ACA CMO108 - 比赛 - SASMO Math 2023</option>
<option value="946">CCD CMO260 - 比赛 - Malaysia International Wind Festival 2023</option>
<option value="947">CCD EAO114 - 额外活动 - 2023年社会服务团《蜈蚣山参学兼打扫活动》</option>
<option value="948">CCD CPI106 - CAMP - 2023年廿四节令鼓队集训营</option>
<option value="949">CCD EAO115 - 额外活动-2023年辅导团《拜访老人院》</option>
<option value="950">CCD PO67 - 表演-培华小学中秋园游会</option>
<option value="951">CCD EAO116 - 额外活动-培华小学中秋园游会摆摊</option>
<option value="952">CCD CPI107 - CAMP-2023年音影技术社《ACTION 4.0》</option>
<option value="953">CCD CPI108 - CAMP-2023天文学会《时光缝隙》</option>
<option value="954">CCD EAO117 - 出游-Pusat Sains天文学会出游</option>
<option value="955">CCD CMO261 - 比赛 - 2023年全森中小学象棋锦标赛</option>
<option value="956">CCD EAI59 - 额外活动-2023年厨艺社《月花情韵》</option>
<option value="957">CCD CMO262 - 比赛 - Inter-Generation Team Chess Tournament 2023 TEAM EVENT</option>
<option value="958">CCD CMO263 - 比赛 - AEON MALL SHAH ALAM CHESS COMPETITION 2023</option>
<option value="959">CCD CMO264 - 比赛 - Kejohanan Catur MSSNS 2023</option>
<option value="960">CCD CMO265 - 比赛 - 环保宣传演示文稿比赛（中学组）</option>
<option value="961">CCD EAI60 - 额外活动-戏剧学会第二届小品演出《顶逢乡舰》</option>
<option value="962">CCD EAO118 - 额外活动 - 李兆祥副董事长令慈出殡仪式</option>
<option value="963">CCD EAO119 - 考试 - Lencana Ekspedisi PPM N9 2023</option>
<option value="964">CCD PO68 - 表演 - 中秋晚会文化表演</option>
<option value="965">CCD CPO46 - CAMP-2023森州华乐节</option>
<option value="966">CCD SO13 - 义工-2023森州华乐节</option>
<option value="967">CCD CPI109 - CAMP - 2023年管乐团《8月训练营》</option>
<option value="968">CCD SI14 - 服务 - 第三届森州合唱节</option>
<option value="969">CCD CPI110 - CAMP-2023年芙蓉中华中学戏剧学会《顶逢乡舰》小品演出筹备营</option>
<option value="970">ACA CMO109 - 比赛- 第 1 届《奕潮杯》癸卯年&quot;兔迎盛世启新程&quot;挥春</option>
<option value="971">CA CMO110 - 比赛- 2023 癸卯千人挥春</option>
<option value="972">ACA CMO111 - 比赛 - 全国中学华语辩论比赛(森州) </option>
<option value="973">CCD CMO266 - 比赛-Pertandingan Koir Festival Bahasa dan Sastera 2023</option>
<option value="974">PE CMO112 - 比赛- 2023年 MSSNS森美兰州学联羽球锦标赛</option>
<option value="975">PE CMO114 - 比赛- 森州水球学联赛</option>
<option value="976">PE CMO110 - 比赛- 2023 MSSNS年森美兰州学联篮球锦标赛 </option>
<option value="977">CCD EAO120 - 额外活动- 足球学会《桑巴舞者》</option>
<option value="978">PE CMO102 - 比赛- Kejohanan Pembangunan Sukan Olahraga MSSNS 2023</option>
<option value="979">PE CMO103 - 比赛 - 2023年度第42届全森少年赛黄朝恩杯乒乓锦标赛</option>
<option value="980">PE CMO106 - 比赛- 2023年 全森15岁以下男女篮球选拔赛</option>
<option value="981">PE CMO104 - 比赛- 2023年MSSD芙蓉县学联乒乓锦标赛</option>
<option value="982">PE CMO105 - 比赛- 2023年 MSSNS森美兰州学联乒乓锦标赛</option>
<option value="983">PE CMO107 - 比赛- 2023年芙蓉分会男女15岁及以下青少年篮球锦标赛</option>
<option value="984">PE CMO108 - 比赛- 2023年芙蓉分会男女17岁及以下青少年篮球锦标赛</option>
<option value="985">PE CMO109 - 比赛- 2023年MSSD芙蓉县学联篮球锦标赛 </option>
<option value="986">PE CMO111 - 比赛-  2023年MSSD芙蓉县学联羽球锦标赛 </option>
<option value="987">PE CMO113 - 比赛- 2023  MSSD 芙蓉县田径学联锦标赛</option>
<option value="988">PE CMO115 - 比赛- 2023 第三届NSIC游泳锦标赛</option>
<option value="989">ACA CMO114 - 比赛- 2023全森中小学征文</option>
<option value="990">ACA CMO115 - 比赛- 第4届2023全国母亲节颂文</option>
<option value="991">ACA CMO116 - 比赛- 2023丹斯里拿督郑富成局绅杯全国征文</option>
<option value="992">ACA CMO117 - 比赛- 2023台积电杯青年尬科学创意表达竞赛</option>
<option value="993">ACA CMO119 - Pertanding Forum Pelajar Sekolah-sekolah Menengah Persendiran Cina 2023</option>
<option value="994">ACA CMO120 - 比赛- 第22届星洲日报中学生时事问答</option>
<option value="995">ACA CMO121 - Pertanding Deklamari Puisi 2023</option>
<option value="996">ACA CMO122 - 2023第5届《她的故事》激励文章征选赛</option>
<option value="997">ACA CMO113 - 比赛- 2023 第三届森州中小学华语诗歌朗诵</option>
<option value="998">CCD CPI111 - CAMP-2023年篮球社 羽球社《THRIVE联办营》</option>
<option value="999">CCD SI15 - 服务 - 2023芙蓉中华中学义卖会</option>
<option value="1000">CCD PI9 - 表演 - 2023年义卖会开幕仪式</option>
<option value="1001">CCD EAI61 - 额外活动-2023年义卖会鬼屋</option>
<option value="1002">ACA CMO136 - 比赛- 2023年陈嘉庚陈六使青少年发明奖(马来西亚)</option>
<option value="1003">ACA CMO137 - 比赛- Usaha Tegas Heritage 2023 Art Competition</option>
<option value="1004">ACA CMO135 - 比赛- 3D Printing Hackathon</option>
<option value="1005">ACA CMO138 - 比赛- Kuiz KIMIA Kebangsaan Malaysia(K3M)2023</option>
<option value="1006">ACA CMO132 - 比赛- 夏大杯中学物理</option>
<option value="1007">ACA CMO133 - Pertandingan Deklamasi Puisi(Festival Bahasa dan Sastera)</option>
<option value="1008">ACA CMO131 - 比赛- 成大数理与商科</option>
<option value="1009">ACA CMO129 - 比赛- English Forum 2023</option>
<option value="1010">ACA CMO124 - 比赛- Raffles Design Contest 2023 2D Character Design (Robot Jr.R)</option>
<option value="1011">ACA CMO125 - 比赛- Malaysia Top10 Outstanding Young Artist 2023 On The Spot Drawing Competition</option>
<option value="1012">ACA CMO126 - 比赛- 2023 Asia International Mathematical Olympiad Final (AIMO Final)</option>
<option value="1013">ACA CMO130 - 比赛- 第43届全国华文独中三语演讲</option>
<option value="1014">ACA CMO110 - 比赛- 2023 癸卯千人挥春</option>
<option value="1015">ACA CMO112 - 比赛- Kangroo Math Competition 2023</option>
<option value="1016">ACA CMO118 - 比赛- 2023陈景润数学</option>
<option value="1017">CCD PI10 - 表演 - 第三届森州合唱节</option>
<option value="1018">ACA CMO139 - 比赛- 2023 World Mathematical Games Open</option>
<option value="1019">ACA CMO127 - 比赛- 2023吴佳鸿数学</option>
<option value="1020">ACA CMO134 - 比赛- Imonst 2023</option>
<option value="1021">PE CMO128 - 比赛- 全国赛田径MSSM 2023</option>
<option value="1022">PE CMO127 - 比赛- Petronas Under 18 Champions</option>
<option value="1023">PE CMO126 - 比赛- 网球州MSSNS Tenis 2023</option>
<option value="1024">PE CMO125 - 比赛- 58th Milo Malaysia Invitational Age Group Water Polo Championship 2023 国赛</option>
<option value="1025">PE CMO124 - 比赛- Utar Table Tenis Invitational Championship</option>
<option value="1026">PE CMO123 - 比赛- 足球2023 MCFA Invitation Tournament U15&amp;U17</option>
<option value="1027">PE CMO121 - 比赛- 网球县MSSD Tenis 2023</option>
<option value="1028">CCD CMO267 - 比赛-中秋模特摄影比赛</option>
<option value="1029">PE CMO117 - 比赛- Participa In Skate Malaysia 2023</option>
<option value="1030">PE CMO119 - 比赛- 周显达杯全森新苗乒乓锦标赛</option>
<option value="1031">PE CMO120 - 比赛- 壁球州MSSNS Skuasy 2023 </option>
<option value="1032">PE CMO122 - 比赛- RSBC Cup 2023</option>
<option value="1033">PE CMO118 - 比赛- MSSD Merentas Desa N.S 2023</option>
<option value="1034">PE CMO116 - 比赛- 全国独中球类区域赛</option>
<option value="1035">CCD CMO268 - 比赛-武吉甲巴央和谐嘉年华全森挥春比赛</option>
<option value="1036">CCD CMO269 - 比赛-2023双亲节书法赛《书法传承双亲的爱》</option>
<option value="1037">CCD CMO270 - 比赛-Kejohanan Wushu KPM-WFM Ke-12 2023</option>
<option value="1038">CCD CMO271 - 比赛-Raffles Design Contest 2023</option>
<option value="1039">CCD EAO121 - 额外活动-Run for Peace Creating a Culture of Peace</option>
<option value="1040">CCD CMO272 - 比赛-ESU-TAYLOR&#039;S PUBLIC SPEAKING COMPETITION</option>
<option value="1041">CCD CMO273 - 比赛-The Dragon Boat Festival Chinese Writing Contest</option>
<option value="1042">CCD CMO274 - 比赛-星洲日报中学生时事问答比赛</option>
<option value="1043">CCD CMO275 - 比赛-第三届国际中学生陈嘉庚常识比赛 初赛</option>
<option value="1044">CCD CMO276 - 比赛-2023 ONLINE INTERNATIONAL MUSIC COMPETITION</option>
<option value="1045">CCD CMO277 - 比赛-亚太少儿书画大赛</option>
<option value="1046">CCD CMO278 - 比赛-Pertandingan Melukis Poster &#039;Embracing Breastfeeding Through Arts&#039;</option>
<option value="1047">CCD CMO279 - 比赛-全国中学生中华文化常识比赛</option>
<option value="1048">CCD CMO280 - 比赛-Father&#039;s day colouring contest 2023</option>
<option value="1049">CCD CMO281 - 比赛-国际网络数学精英挑战赛2023</option>
<option value="1050">CCD CMO282 - 比赛-Amateur Rising Star Junior Under-16</option>
<option value="1051">CCD CMO283 - 比赛-Dance Now Open Showcase</option>
<option value="1052">CCD CMO284 - 比赛-Kategori 2-Pertandingan Mewarna Sempena Bulan Kebangsaan 2023</option>
<option value="1053">CCD CMO285 - 比赛 - MISS MALAYSIA KEBAYA COMPETITION</option>
<option value="1054">CCD CMO286 - 比赛-Mr , Miss and Mrs Universe of World Peace </option>
<option value="1055">CCD CMO287 - 比赛 - Bangkok international dance challenge</option>
<option value="1056">CCD CMO288 - 比赛-第九届世界传统武术锦标赛</option>
<option value="1057">CCD CMO289 - 比赛-&quot;你好！中国”——中马50 以心相交绘画比赛</option>
<option value="1058">CCD CMO290 - 比赛 - 6th CRYSTAL DANCE CHAMPIONSHIP 2022</option>
<option value="1059">CCD CMO293 - 比赛-Negeri Sembilan International Dancesport Championship 2023</option>
<option value="1060">CCD CMO291 - 比赛-WSSA Malaysia Open Sport Stacking Championships 2023</option>
<option value="1061">CCD CMO292 - 比赛 - KEJOHANAN RENANG &quot;SHORT COURSE&quot; N.S. 2022</option>
<option value="1062">CCD CPO47 - CAMP - 2022全国绿色状元·森州站《绿火飞跃营》</option>
<option value="1063">CCD CMO294 - 比赛-Pertandingan Xiangqi Sekolah Rendah dan Menengah Negeri Sembilan 2023 Kumpulan U18</option>
<option value="1064">CCD CMO295 - 比赛 - 中国海外青少年中华文化大赛声乐赛道</option>
<option value="1065">CCD CMO296 - 比赛-星洲日报中学生时事问答比赛</option>
<option value="1066">CCD EAO122 - 额外活动-2nd International Dance &amp; Music Cross Cultural 2023</option>
<option value="1067">CCD CMO297 - 比赛 - CANADA INTERNATIONAL MUSIC PERCUSSION COMPETITION(PIANO)</option>
<option value="1068">CCD CMO298 - 比赛-Genesis Dance Competition VOL.6 2023</option>
<option value="1069">CCD CMO299 - 比赛-58th Milo/PRM Malaysia Invitational Age Group Artistic Swimming Championship 2023</option>
<option value="1070">CCD CMO300 - 比赛 - 2023挥春吹梅公开赛</option>
<option value="1071">CCD CMO301 - 比赛-Flower World Colouring Contest</option>
<option value="1072">CCD CMO302 - 比赛 - TAIWAN ROTARY INTERNATIONAL YOUTH DANCE CHAMPIONSHIP</option>
<option value="1073">CCD CMO303 - 比赛-The National Independence Day Colouring Contest</option>
<option value="1074">CCD CMO304 - 比赛-Pertandingan Mewarna Bersempena Hari Kemerdekaan&amp; Hari Malaysia</option>
<option value="1075">CCD CMO305 - 比赛 - 二月初二龙抬头绘画与填色比赛</option>
<option value="1076">CCD CMO306 - 比赛-DANSPIRATION OPEN INTERNATIONAL BALLROOM DANCE CHAMPIONSHIP 2023</option>
<option value="1077">CCD CMO307 - 比赛-Merdeka Colouring Contest 2023</option>
<option value="1078">CCD CMO308 - 比赛 - 第28届癸卯年《墨海翻腾展鸿兔》</option>
<option value="1079">CCD CMO309 - 比赛-LOVIC杯2023年第一届绘画比赛</option>
<option value="1080">CCD CMO310 - 比赛 - 2023奕潮杯挥春比赛</option>
<option value="1081">CCD CMO311 - 比赛-Young Artist Award 2023</option>
<option value="1082">CCD CMO312 - 比赛-MALAYSIA HEROS CUP</option>
<option value="1083">CCD CMO313 - 比赛 - 好运蹦兔U！ 兔子服装设计比赛</option>
<option value="1084">CCD CMO314 - 比赛-NSSPC 全国中学生程式设计比赛 2023</option>
<option value="1085">CCD EAO123 - 首届采乐杯额外活动 - 古筝精英展演邀请</option>
<option value="1086">CCD CMO315 - 比赛-盛夏钢琴祭2023</option>
<option value="1087">CCD CMO316 - 比赛-Sunway Competition 2023</option>
<option value="1088">CCD CMO317 - 比赛-pinnacle sri petaling mall 杯 2023年青少年象棋锦标赛18岁以下</option>
<option value="1089">CCD CMO318 - 比赛-JOGJAKARTA TAEKWONDO INTERNATIONAL OPEN</option>
<option value="1090">CCD CMO319 - 比赛-第十五届香港国际武术比赛</option>
<option value="1091">CCD CMO320 - 比赛-2023 Gold Star Music Festival</option>
<option value="1092">CCD CMO321 - 比赛-TAEKWONDO INTERNATIONAL OPEN</option>
<option value="1093">CCD CMO322 - 比赛-Malaysia Ukulele Song Competition 2023</option>
<option value="1094">CCD CMO323 - 比赛 - 芙蓉中华校友挥春比赛</option>
<option value="1095">CCD CMO324 - 比赛 - 第39届全森中小学挥春观摩赛</option>
<option value="1096">CCD CMO325 - 比赛-PERTANDINGAN MEWARNA DAN MELUKIS</option>
<option value="1097">CCD CMO326 - 比赛 - 2023癸卯千人挥春比赛</option>
<option value="1098">CCD CMO327 - 比赛-The 3rd Kuala Lumpur City International Ballroom &amp; Latin Dance championship 2023</option>
<option value="1099">CCD CMO328 - 比赛 - 国际线上数学精英公开赛2023</option>
<option value="1100">CCD CMO329 - 比赛 - 2023《群兔躍新程》新春嘉年华挥春比赛</option>
<option value="1101">CCD CMO330 - 比赛 - 第37届全国挥春大赛</option>
<option value="1102">CCD CMO331 - 比赛 - Malaysia Ballet Festival</option>
<option value="1103">CCD CMO332 - 比赛 - ST.PETERSBURG INTERNATIONAL MUSIC COMPETITION FINAL(PIANO)</option>
<option value="1104">CCD CMO333 - 比赛-第二届凛然正气杯全国硬笔书法赛</option>
<option value="1105">CCD CPO48 - CAMP - ECOPRENEUR YOUTH LEADERSHIP CAMP 2023</option>
<option value="1106">CCD EAO124 - 额外活动 - 癸卯年马来西亚森州青运醒狮团舞龙训练班</option>
<option value="1107">CD CMO334 - 比赛-2023 MyTOWN KL XiangQi Student Tournament</option>
<option value="1108">CCD CMO334 - 比赛 - PERTANDINGAN MELUKIS KL PARK FESTIVAL 2023</option>
<option value="1109">CCD CMO335 - 比赛 - 亚洲国际艺术节</option>
<option value="1110">CCD CMO345 - 比赛-2023 MyTOWN KL XiangQi Student Tournament</option>
<option value="1111">CCD CMO336 - 比赛 - 3rd TIRTA TARUNA 66 INTERNATIONAL DIVING AND ARTISTIC SWIMMING CHAMPIONSHIP GBK AQUATIC STADIUM,JAKARTA</option>
<option value="1112">CCD CMO337 - 比赛-9th IMU Science Discovery Challenge 2023</option>
<option value="1113">CCD CMO338 - 比赛-MAS/MILO/NSC MID&amp;LONG DISTANCE SWIMMING CHAMPIONSHIP 2023</option>
<option value="1114">CCD CMO339 - 比赛-Peace Poster</option>
<option value="1115">CCD CMO340 - 比赛-1 Shamelin Mall Sport Stacking Championships 2023</option>
<option value="1116">CCD CMO341 - 比赛-LIONS CLUB INTERNATIONAL PEACE POSTER COMPETITION</option>
<option value="1117">CCD CMO342 - 比赛-中秋添色比赛 2023</option>
<option value="1118">CCD CMO343 - 比赛-Young Innovators Challenge(YIC)</option>
<option value="1119">CCD CMO344 - 比赛-2023马来西亚妇女节第六届《她的故事》激励文章征选赛森州赛区</option>
<option value="1120">CCD CMO346 - 比赛-2nd Malaysian Medalist Dancesport Grandpix 2023 ( Solo U14(R) ) </option>
<option value="1121">CCD CMO347 - 比赛-2nd Malaysian Medalist Dancesport Grandpix 2023 ( Solo U14(R) ) </option>
<option value="1122">CCD CMO348 - 比赛-Endorsed &amp; Sanctioned by the Ministry of Education( SOLO U14(PD))</option>
<option value="1123">CCD CMO349 - 比赛-武吉甲巴央和谐嘉年华全森挥春比赛</option>
<option value="1124">CCD CMO350 - SELANGOR DANCESPORT CHAMPIONSHIP 2023</option>
<option value="1125">ACA CMO128 - 比赛- 第二届凛然正气杯全国硬笔书法赛</option>
<option value="1126">CCD CMO351 - 复活节创意填色绘画比赛</option>
<option value="1127">CCD CMO352 - Dpulze OPEN SPORT STACKING CHAMPIONSHIPS</option>
<option value="1128">CCD CMO353 - WORLD SPORT STACKING CHAMPIONSHIPS 2023</option>
<option value="1129">CCD CMO354 - 上·文化国际青年音乐节2023网上音乐大赛-初赛</option>
<option value="1130">CCD CMO355 - 16th National Ballroom Dancing Championships 2023</option>
<option value="1131">CCD CMO378 - NS DANCE CHAMPIONSHIPS 2023</option>
<option value="1132">CCD CMO356 - 1 Shamelin Mall Youth Xiang Qi Tournament</option>
<option value="1133">CCD CMO357 - Selangor Open Dance Championship 2023</option>
<option value="1134">CCD CMO358 - Kids Got Talent Malaysia ,Mini Heroes Coloring Contest 2023</option>
<option value="1135">CCD CMO359 - Kejohanan Seni Mempertahankan Diri Peringkat Kebangsaan</option>
<option value="1136">CCD CMO360 - 2nd Selangor Invitational Age Group Artistic Swimming Championship 2023</option>
<option value="1137">CCD CMO361 - 3rd Kuala Lumpur 5v5 Mini Water Polo 2023</option>
<option value="1138">CCD CMO362 - DANCE TALENT COMPETITION</option>
<option value="1139">CCD CMO363 - 2023 ALLEGRO OPEN SOLO &amp; MEDALIST CHAMPIONSHIP U16</option>
<option value="1140">CCD CMO364 - Star Avenue Colouring Contest 2023</option>
<option value="1141">CCD CMO365 - WSSA 2023 MesaMall Open Sport Stacking Championships</option>
<option value="1142">CCD CMO366 - 2023 Asia International Mathematical Olympiad Open Contest Trial Round</option>
<option value="1143">CCD CMO367 - 上文化国际青年音乐节</option>
<option value="1144">CCD CMO368 - ASIA TAEKWON-DO INVITATIONAL CHAMPIONSHIP</option>
<option value="1145">CCD CMO369 - 2023 Klang Open International Ballroom Dance Championship</option>
<option value="1146">CCD CMO370 - Malaysia Challenge Cup Dance Competition 2023</option>
<option value="1147">CCD CMO371 - Father‘s Day Coloring Contest 2023</option>
<option value="1148">CCD CMO372 - 2023年感恩卡设计比赛</option>
<option value="1149">CCD CMO373 - 2023 MESAMALL NILAI全国象棋公开赛</option>
<option value="1150">CCD CMO374 - Korean Mask Painting Contest</option>
<option value="1151">CCD CMO375 - 亚洲少儿艺术人才国际大奖赛</option>
<option value="1152">CCD CMO376 - 3rd Wushu Union Cup Traditional Wushu Competition 2023</option>
<option value="1153">CCD CMO377 - 第十届香港国际音乐节2023音乐比赛</option>
<option value="1154">CCD SI16 - 服务-2023全国华文独中三语演讲比赛</option>
<option value="1155">CCD PO69 - 表演 - Majlis Penutup Kejohanan Olahraga MSSM Kali Ke-63 Tahun 2023</option>
<option value="1156">CCD EAO125 - 额外活动 - Sambutan World Jota&amp;Joti 2023 (Daerah Seremban Timur))</option>
<option value="1157">PE CMO0 - 比赛 - 2019 English Essay-writing Competition</option>
<option value="1158">CCD EAO126 - 额外活动-摄影学会《巴生来敲门》</option>
<option value="1159">CCD EAO127 - 额外活动-吉他社 公演观摩</option>
<option value="1160">CCD EAI62 - 额外活动-音乐学会 《高三叙别会》</option>
<option value="1161">CCD EAO128 - 额外活动-2023中国北京国际表扬大会. 马来西亚金艺颁奖典礼</option>
<option value="1162">CCD EAI63 - 额外活动-2023年 摄影学会 售卖班级照以及学会照</option>
<option value="1163">CCD CMO379 - 比赛-PERTANDINGAN MELUKIS POSTER TAHUN 2023 ANJURAN PERSATUAN PERUBATAN MALAYSIA(MMA)</option>
<option value="1164">CCD EAO129 - 额外活动-2023 全森民族舞蹈观摩会演出 (舞蹈学会)</option>
<option value="1165">CCD CPI112 - CAMP-2023年影音技术社培训营</option>
<option value="1166">CCD CPO49 - CAMP-波中华乐交流营</option>
<option value="1167">CCD CPO50 - CAMP - Perkhemahan Kem Generasi Madani</option>
<option value="1168">CCD EAO130 - 额外活动 - Astro《就是爱欢喜》龙年特辑</option>
<option value="1169">CCD PO70 - 表演 - Performance at Louis Vuitton TRX store opening</option>
<option value="1170">CCD PO71 - 表演 - Performance：Company Annual Dinner</option>
<option value="1171">CCD EAI64 - 额外活动-2023年第38届戏剧学会叙别会</option>
<option value="1172">CCD CPI113 - CAMP - 2023年廿四节令鼓30周年演奏会《追本溯源》集训营</option>
<option value="1173">CCD PO72 - 表演- BMW Opening Ceremony</option>
<option value="1174">CCD PI11 - 表演-廿四节令鼓30周年演奏会《追本溯源》</option>
<option value="1175">CCD SI17 - 义工-廿四节令鼓30周年演奏会《追本溯源》</option>
<option value="1176">CCD CMO380 - 2024 马来西亚首届槟榔杯国际舞蹈比赛</option>
<option value="1177">CCD PO73 - 表演 - “龙腾南社”挥春比赛开幕</option>
<option value="1178">CCD PO74 - 表演 - 第29届《墨海翻腾迎祥龙》挥春及填色比赛开幕典礼</option>
<option value="1179">CCD PO75 - 表演 - 《群龙齐藤旺九州》新春嘉年华</option>
<option value="1180">CCD PO76 - 表演 - Sambutan Hari Jadi</option>
<option value="1181">CCD PO77 - 表演 - The Togetherness Festival</option>
<option value="1182">CCD CMO381 - 比赛 - 2024年《1 Shamelin Mall》第2届全国中小学象棋公开赛</option>
<option value="1183">CCD PO78 - 表演 - 龙腾飞翔百业昌荣新春晚宴</option>
<option value="1184">CCD SI18 - 义工-《Keep Going》 杜韩念慈善唱说会</option>
<option value="1185">CCD CMO382 - 比赛-瓜拉庇劳西天宫-模特摄影比赛</option>
<option value="1186">CCD CPI114 - CAMP - 2024廿四节令鼓《公开赛》集训营</option>
<option value="1187">CCD CPI115 - CAMP - 2024管乐团《3月份训练营》</option>
<option value="1188">CCD CMO383 - 比赛- 2024年全国中小学象棋公开赛</option>
<option value="1189">CCD EAO131 - 额外活动- Bengkel Latihan Pertolongan Cemas dan Perawatan</option>
<option value="1190">CCD CMO384 - 《鼓手云集》廿四节令鼓中学公开赛</option>
<option value="1191">CCD SI19 - 服务-活动名称：清明报恩护世息災中峰三时系念超荐法会</option>
<option value="1192">CCD EAO132 - 额外活动- Beyond Boundaries: Connecting Worlds in Space 天文讲座</option>
<option value="1193">CCD EAO133 - 额外活动-2024年 第7届南马独中合唱观摩会</option>
<option value="1194">CCD CMO385 - 比赛- KIMMA WILAYAH 西洋棋比赛</option>
<option value="1195">CCD PO79 - 表演-Majlis  Rumah Terbuka Hari Raya Aidilfitri Peringkat N.S Tahun 2024</option>
<option value="1196">CCD CPI116 - CAMP- 2024年戏剧学会《寻根启示》新生营</option>
<option value="1197">CCD CPI117 - CAMP- 2024年管乐团《4月份集训营及新生营》</option>
<option value="1198">CCD CPI118 - CAMP- 2024年廿四节令鼓《4月元壹》集训营</option>
<option value="1199">CCD CPI119 - CAMP- 街舞社《PROCEED·前进》生活营</option>
<option value="1200">CCD CPI120 - CAMP- 扯铃学会《训练营》</option>
<option value="1201">CCD CPI121 - CAMP- 2024年圣约翰救伤队《集训营》</option>
<option value="1202">CCD CPI122 - CAMP- 2024年天文学会《星途征程》新生营</option>
<option value="1203">CCD CPO51 - CAMP- YCA 干部训练营</option>
<option value="1204">CCD CPI123 - CAMP- 华乐团《乐永聚》集训营</option>
<option value="1205">CCD CMO386 - 比赛-PERTANDINGAN KALIGRAFI SEKOLAH-SEKOLAH RENDAH DAN MENENGAH PERINGKAT NEGERI KALI KE-37 SEMPENA TAHUN BARU CINA</option>
<option value="1206">CCD CPO52 - CAMP-Kuiz Digital NowyouSEEme Kempen Kesedaran Thalassaemia Kebangsaan</option>
<option value="1207">CCD CMO387 - 比赛-第二届国际中学生陈嘉庚常识比赛</option>
<option value="1208">CCD CMO388 - 比赛-8th IMU Virtual Science Discovery Challenge 2022</option>
<option value="1209">CCD CMO389 - 比赛-PERTANDINGAN KALIGRAFI ANTARA SEKOLAH-SEKOLAH RENDAH DAN MENENGAH NEGERI SEMBILAN KALI KE-39</option>
<option value="1210">CCD PO80 - 表演-Panggung Seni Traditional 2023</option>
<option value="1211">CCD CMO390 - 比赛-KEJOHANAN WUSHU ( PERINGKAT NEGERI ) NEGERI SEMBILAN 2023</option>
<option value="1212">CCD CMO391 - 比赛-少儿武术比赛</option>
<option value="1213">CCD CMO392 - 比赛-Kangaroo Math Competition</option>
<option value="1214">CCD CMO393 - 比赛-Royal Siam Cup 2023</option>
<option value="1215">CCD CMO394 - 比赛-Malaysia Traditional and Latin and Ballroom Dance Competition </option>
<option value="1216">CCD CMO395 - 比赛-Kuala Lumpur Open Dance Championship 2023 by Malaysia Ballroom Dance</option>
<option value="1217">CCD EAO134 - 额外活动-GMUN 2023 CONFERENCE</option>
<option value="1218">CCD CMO396 - 比赛-逢甲杯书法比赛</option>
<option value="1219">CCD CMO397 - 比赛-6th Malaysia Ukulele Festival International Level </option>
<option value="1220">CCD CMO398 - 比赛-2nd Malaysian Medalist Dancesport Grandprix 2023</option>
<option value="1221">CCD CMO399 - 比赛-MAS/NSC/MILO SPORTEXCEL JUNIOR SWIMMING CIRCUIT</option>
<option value="1222">CCD CMO400 - 比赛-毕加芬绘画大赛2023年（秋季）</option>
<option value="1223">CCD EAO135 - 额外活动-龙溪国民型华文学校“星洲情义嘉年华”</option>
<option value="1224">CCD CMO401 - 比赛-crystal open dancesport championships 2023</option>
<option value="1225">CCD CMO402 - 比赛-3RD UTAR Goshin-Ryu Karate INter- Dojo Championship 2023</option>
<option value="1226">CCD CMO403 - 比赛-DZONE</option>
<option value="1227">CCD CMO404 - 比赛-第六届全球华语朗诵大赛暨第一届“完美杯”马来西亚华语诗歌朗诵比赛</option>
<option value="1228">CCD CMO405 - 比赛-1st hoshi ryu open karate championship</option>
<option value="1229">CCD CMO406 - 比赛-crystal open dancesport championship 2023</option>
<option value="1230">CCD CMO407 - 比赛-全森中小学书法比赛</option>
<option value="1231">CCD CMO408 - 比赛-6th DanceMaxx International Ballroom Dancing Championship</option>
<option value="1232">CCD CMO409 - 比赛-叠杯比赛</option>
<option value="1233">CCD CMO410 - 比赛-3打3篮球比赛</option>
<option value="1234">CCD EAO136 - 额外活动-马来西亚国际艺术节</option>
<option value="1235">CCD CMO411 - 比赛-12th Asia Pacific Open And Age Groups Artistic Swimming Championships 2023</option>
<option value="1236">CCD CMO412 - 比赛-12th KK Goju-Kai Selangor Open Karate Championship</option>
<option value="1237">CCD EAO137 - 额外活动-SUN M,UN2023 UNITED NATIONS GENERAL ASSEMBLY</option>
<option value="1238">CCD CMO413 - 比赛-Perak International Dance Championship 2023 PIDC</option>
<option value="1239">CCD CMO414 - 比赛-The 11th Singapore Open Dance Championship 2023 </option>
<option value="1240">CCD CMO415 - 比赛-zlba badminton championship 2023</option>
<option value="1241">CCD CPO53 - CAMP-DIPLOMATIC LEADERS MODEL UNITED NATIONS TRANING CAMP</option>
<option value="1242">CCD CMO416 - 比赛-第四届国际汉语节2023/2024</option>
<option value="1243">CCD CMO417 - 比赛-PERTANDINGAN KALIGRAFI ANTARA SEKOLAH-SEKOLAH RENDAH DAN MENENGAH NEGERI SEMBILAN KALI KE-40</option>
<option value="1244">CCD CMO418 - 比赛-香港正统跆拳道联盟ITF邀请赛</option>
<option value="1245">CCD CMO419 - 比赛-2024波德申德教会紫德阁挥春吹梅公开赛</option>
<option value="1246">CCD CMO420 - 比赛-2024甲辰年千人挥春比赛</option>
<option value="1247">CCD CMO421 - 比赛-Maxxima Junior Challenge Badminton Championship 2024</option>
<option value="1248">CCD CMO422 - 比赛-&quot;year of the dragon&quot; pertandingan kaligrafi</option>
<option value="1249">CCD CMO423 - 比赛-第二届奕潮杯挥春比赛</option>
<option value="1250">CCD CMO424 - 比赛-59th MILO/MAS Malaysia Invitational Age Group (MIAG) 2024</option>
<option value="1251">CCD EAO138 - 额外活动-HARI PERPADUAN SILANG BUDAYA PERINGKAT NEGERI SEMBILAN TAHUN 2024</option>
<option value="1252">CCD CMO425 - 比赛-2024森美兰海南会馆祥龙献瑞挥春赛</option>
<option value="1253">CCD CPO54 - CAMP-2024年中国寻根之旅 冬令营 广东惠州营</option>
<option value="1254">CCD CMO426 - 比赛-第一届万友新春象棋U18个人公开赛</option>
<option value="1255">CCD CPO55 - CAMP-2024年 ’中国寻根之旅‘ 冬令营（广东省惠州文化传统营）</option>
<option value="1256">CCD CMO427 - 比赛-新春摄影大赛2024 The Spring Festival Photography Contest 2024</option>
<option value="1257">CCD CMO428 - 比赛-SPORT EXCEL/MILO/NSC/MAS SWIMMING CIRCUIT 2024</option>
<option value="1258">CCD EAO139 - 额外活动-NISMUNC&#039;24 AS THE DELEGATE FRANCE IN DESEC (UNITED NATIONS DISARMAMENT AND INTERNATIONAL SECURITY COMMITTEE)</option>
<option value="1259">CCD CMO429 - 比赛-第33届全国华人舞蹈节暨第22届全国华校校际舞蹈观摩赛</option>
<option value="1260">CCD CMO430 - 比赛-WORLD CHAMPIONSHIP INTERNATIONAL COMPETITION 2024</option>
<option value="1261">CCD CMO431 - 比赛-龙兴山观音庙象棋锦标赛</option>
<option value="1262">CCD CMO432 - 比赛-Glamour International Ballroom Dance Championship</option>
<option value="1263">CCD CMO433 - 比赛-Gold Star International Music Competition</option>
<option value="1264">CCD CMO434 - 比赛-champion cup international ballroom dance championship</option>
<option value="1265">CCD CMO435 - 比赛-3rd malaysia medalist dancesport grandprix 2024</option>
<option value="1266">CCD CMO436 - 比赛-Taekwondo and Prosport</option>
<option value="1267">CCD CMO437 - 比赛-BAILANDO OPEN CHAMPIONSHIPS </option>
<option value="1268">CCD CMO438 - 比赛-圆牵缘之舞台• 未来的自己</option>
<option value="1269">CCD CMO439 - 比赛-3RD Negeri Sembilan Medalist Dance Championship</option>
<option value="1270">CCD CMO440 - 比赛-EUROASIA YOUTH MUSIC FESTIVAL 2024</option>
<option value="1271">CCD CMO441 - 比赛-True Strike Badminton Academy Internal Tournament</option>
<option value="1272">CCD CMO442 - 比赛-第十八届雪隆精武杯中小学生象棋锦标赛</option>
<option value="1273">CCD CMO443 - 比赛-&#039;PURCON杯&#039;第34届全国象棋个人锦标赛</option>
<option value="1274">CCD CMO444 - 比赛-MAS /NSC / MILO SPLASH SWIM SERIES 2024 1ST LEG</option>
<option value="1275">CCD CMO445 - 比赛-MDS INTERNATIONAL DANCE OPEN CHAMPIONSHIP 2024 </option>
<option value="1276">CCD CMO446 - 比赛-Hari Belia Negara Negeri Sembilan</option>
<option value="1277">CCD CMO447 - 比赛-2024年奥漾杯亚太青少年花样游泳邀请赛</option>
<option value="1278">CCD CMO448 - 比赛-PERTANDINGAN CATUR HARI BELIIA NEGARA PERINGKAT NS 2024</option>
<option value="1279">CCD CMO449 - 比赛-第四届森州中小学华语诗歌朗诵比赛</option>
<option value="1280">CCD CMO450 - 比赛-诚兴有机食品南马独中象棋团体赛</option>
<option value="1281">CCD CMI29 - 比赛-2024全校班级合唱比赛</option>
<option value="1282">CCD CMO451 - 比赛-高学杯辩论赛</option>
<option value="1283">CCD CMO452 - 比赛-GALAXY EXPLORER COMPETITION</option>
<option value="1284">CCD PO81 - 表演-JKKNNS元首诞辰表演</option>
<option value="1285">CCD EAO140 - 《乐动心弦》演奏会</option>
<option value="1286">CCD CMO453 - 比赛- 2024马来西亚廿四节令鼓全国精英赛（南马区域赛）</option>
<option value="1287">CCD CMO454 - 比赛- 2024 年芙蓉 MSSD学联国际象棋锦标赛</option>
<option value="1288">001 - CCD CPI124</option>
<option value="1289">CCD CPI124 - 2024戏剧学会《仙途之旅》内训营</option>
<option value="1290">PE CMO130 - 比赛 - Ah Paw N.S Table Competition</option>
<option value="1291">PE CMO131 - 比赛 - Persatuan Squash Negeri Sembilan Open</option>
<option value="1292">PE CMO132 - 比赛 - Kejohanan Bola Tampar MSSD Negeri Sembilan 2024</option>
<option value="1293">PE CMO133 - 比赛 - Kejohanan Ping Pong MSSD Negeri Sembilan 2024</option>
<option value="1294">CCD CPI125 - CAMP- 华乐团《初音奇航》集训营</option>
<option value="1295">PE CMO134 - 比赛 - N.S Badminton2024</option>
<option value="1296">CCD CPI126 - CAMP- 醒狮团《狮缘》交流营</option>
<option value="1297">ACA CMO142 - 比赛 - 芙蓉振华中学挥春</option>
<option value="1298">CCD EAO141 - 额外活动-MRC International Talent Competition 2024</option>
<option value="1299">ACA CMO143 - 比赛 - 2024年第29届《墨海翻腾迎祥龙》</option>
<option value="1300">ACA CMO144 - 比赛 - SASMO 2024</option>
<option value="1301">CCD SI20 - 义工-2024管乐演奏会</option>
<option value="1302">CCD SI21 - 服务- 2024教师节庆典《起缘·惜缘》</option>
<option value="1303">CCD PI12 - 2024教师节庆典《起缘·惜缘》</option>
<option value="1304">CCD EAO142 - 28th IPS ASTRONOMY RETREAT</option>
<option value="1305">CCD CPO56 - CAMP-MFLS( Malaysia Future Leaders School) 2024</option>
<option value="1306">CCD CPO57 - CAMP-SALT-CIS 2024 SUNWAY 大学独中领袖营培训营</option>
<option value="1307">ACA CMO147 - 比赛 - 2024年第十七届马来西亚华文独中科学营 天津大学与拉曼大学中学科学营</option>
<option value="1308">ACA CMO148 - 比赛 - 马大华文学会第六届全国中学生相声比赛</option>
<option value="1309">ACA CMO149 - 比赛 - Sunway BusunessInnovation Challenge(SBIC)Competition 2024</option>
<option value="1310">ACA CMO150 - 比赛 - MIMAS Competition 2024</option>
<option value="1311">CCD PO82 - 表演- PICC出队</option>
<option value="1312">CCD EAO143 - 出游- 商学会参观巧克力工厂</option>
<option value="1313">CCD EAO144 - 出游- 壁球社白石山出游</option>
<option value="1314">CCD SI22  - 义工- 2024义卖会</option>
<option value="1315">CCD CMO455 - 比赛- 华乐团全国中学生比赛</option>
<option value="1316">CCD CPO58 - 2024年 摄影学会《静燃初夏》生活营</option>
<option value="1317">CCD PO83 - 表演- 廿四，醒狮森美兰自由车摩多汽车电器商会100周年晚会</option>
<option value="1318">CCD CPI127 - CAMP-2024年 吉他社 《弦外之音》</option>
<option value="1319">CCD EAO145 - 额外活动-2024年 英文学会《Community Service cum Beach Clean-up Activities》</option>
<option value="1320">CCD CPO59 - CAMP- 《童军童善》全国童军趣味竞赛营</option>
<option value="1321">CCD PI13 - 表演 - 2024校庆运动会</option>
<option value="1322">CCD EAI65 - 额外活动-2024年 音乐学会《隆中交流会》</option>
<option value="1323">CCD PO84 - 表演- Performance at Louis Vuitton Bukit Bintang store opening</option>
<option value="1324">CCD EAO146 - 额外活动- 香港中乐团交流会</option>
<option value="1325">CCD EAO147 - 额外活动- 森美兰国庆日升旗礼</option>
<option value="1326">CCD CPI128 - CAMP- 2024年 华文学会 《2024 缘夏》</option>
<option value="1327">CCD CPI129 - CAMP-2024年 音乐学会《步步为音》生活营</option>
<option value="1328">CCD CMO456 - 比赛-2024年第二届 《永远的照亮》全国中学合唱团</option>
<option value="1329">CCD CMO457 - 比赛-2024年 《摄影从0开始》</option>
<option value="1330">CCD EAI 66 - 额外活动-2024年 摄影学会《信短情长》教师节售卖明信片</option>
<option value="1331">CCD EAI67 - 额外活动-摄影学会《售卖班级照及学会照》</option>
<option value="1332">CCD EAI68 - 额外活动-2024年 游泳学会《S.U.2.0》</option>
<option value="1333">CCD EAO148 - 额外活动-2024年 园艺学会出游</option>
<option value="1334">CCD SI23 - 服务-2024年芙蓉中华中小学111周年校庆晚宴</option>
<option value="1335">CCD PI14 - 表演-2024年芙蓉中华中小学111周年校庆晚宴</option>
<option value="1336">CCD CMO458 - 比赛- mssns catur</option>
<option value="1337">CCD CMO459 - 2024年第26届福联青全中辩（森美兰州初赛）</option>
<option value="1338">CCD CMO460 - 比赛 - 2024年夏芒杯国际中小学生华语辩论公开赛</option>
<option value="1339">CCD CMO461 - 比赛 - 2024年全国扯铃观摩会暨交流营</option>
<option value="1340">CCD EAI69 - 额外活动- 森州壁球协会25周年晚宴</option>
<option value="1341">CCD EAI70 - 额外活动 - 台湾国立嘉义大学交流会</option>
<option value="1342">PE CMO135 - 比赛 - Badminton MSSD S1 2024</option>
<option value="1343">PE CMO136 - 比赛 - Badminton MSSNS 2024 </option>
<option value="1344">CCD PI15 - 表演 - 2024谢文川画展开幕礼</option>
<option value="1345">PE CMO141 - 比赛 - 2024年度第43届全森少年赛黄朝恩杯乒乓锦标赛</option>
<option value="1346">CCD EAO149 - 额外活动- 大旗祥龙瑞狮雷鼓集体开光仪式</option>
<option value="1347">CCD EAO150 - 额外活动- 森美兰留台同学会60周年会庆午宴</option>
<option value="1348">CCD EAO151 - 额外活动- 滨华24节令鼓《水土》演奏会</option>
<option value="1349">CCD PO85 - 表演 - 2024培华小学中秋园游会</option>
<option value="1350">CCD EAO152 - 额外活动 - 2024培华小学中秋园游会</option>
<option value="1351">PE CMO137 - 比赛 - Olahraga MSSD S1 2024</option>
<option value="1352">PE CMO138 - 比赛 - Bola Keranjang MSS Negeri Sembilan 2024</option>
<option value="1353">PE CMO139 - 比赛 - Ping Pong MSS Negeri Sembilan 2024</option>
<option value="1354">PE CMO140 - 比赛 - Bola Tampar MSSD 2024</option>
<option value="1355">PE CMO142 - 比赛 - Bola Keranjang MSSD 2024</option>
<option value="1356">ACA CMO151 - 比赛 - SUNWAY Oxbridge Essay Competition 2024</option>
<option value="1357">ACA CMO152 - 比赛 - 第21届全国中学生《杨靖耀中华文化营》</option>
<option value="1358">CCD EAO153 - 额外活动- 福州会馆晚宴</option>
<option value="1359">CCD EAO154 - 额外活动-2024年摄影学会KLPF 吉隆坡摄影节</option>
<option value="1360">CCD PO86 - 表演 - 2024森美兰州人民公正党中秋晚宴</option>
<option value="1361">CCD CPO60 - CAMP - 2024 Astronaut Search and Rescue Mission</option>
<option value="1362">CCD CMO463 - 比赛 - 2024年第四届《初学杯》全国中学辩论赛</option>
<option value="1363">CCD CMO464 - 比赛- 第6届国际二十四节令鼓节暨大马精英赛2024</option>
<option value="1364">CCD CMO462 - 比赛 - Pertandingan Koir - Festival Bahasa dan Sastera 2024初赛</option>
<option value="1365">CCD EAO155 - 额外活动- 《旧书重生》计划</option>
<option value="1366">CCD CMO465 - 比赛 - Malaysia International Wind Festival (miwFest) 2024</option>
<option value="1367">CCD EAI71 - 额外活动 - UNESCO《售卖帆布包》</option>
<option value="1368">CCD CMI30 - 比赛 - 电脑学会《同人创作电绘比赛》</option>
<option value="1369">CCD CPI130 - CAMP - 辩论社《思维狂欢夜》</option>
<option value="1370">CCD CPI131 - CAMP - 影音技术社《凝聚3.0》</option>
<option value="1371">CCD EAI72 - 额外活动 - 管乐团《旭乐之辰Music Odyssey》</option>
<option value="1372">CCD EAI73 - 额外活动 - 街舞社《快闪街舞》</option>
<option value="1373">CCD EAI74 - 额外活动 - 街舞社《以舞之名 炫动节奏》</option>
<option value="1374">CCD CMO466 - 比赛- 2024年马来西亚日摄影比赛</option>
<option value="1375">CCD CPI132 - CAMP- 廿四节令鼓9月《元壹》集训营</option>
<option value="1376">CCD CPI133 - CAMP- 廿四节令鼓队《鼓韵新声》</option>
<option value="1377">CCD PO87 - 表演- 马来西亚瀛海永春山城蔡氏同乡会第一届就职典礼</option>
<option value="1378">ACA CMO153 - 比赛 - Pertandingan Forum Pelajar 2024</option>
<option value="1379">ACA CMO154 - 比赛 - 陈嘉庚常识比赛</option>
<option value="1380">ACA CMO155 - 比赛 - Vitrox Tech4 Good Challenge 2024 Technical Workshop</option>
<option value="1381">ACA CMO156 - 比赛 - 《燃Resuragence》Character Design Competition 2024 Prize Award Areement</option>
<option value="1382">ACA CMO157 - 比赛 - 2024 第四届全森中小学华语诗歌朗诵比赛</option>
<option value="1383">PE CMO144 - 比赛 - 2024年第13届全国华文独中田径锦标赛</option>
<option value="1384">PE CMO143 - 比赛 - Kejohanan Olahraga MSS Negeri Sembilan 2024</option>
<option value="1385">ACA CMO162 - CAMP -“嘉庚”号 科学考察船2024年马来西亚开放日</option>
<option value="1386">CCD EAO156 - 额外活动- 廿四节令鼓《如来藏》演奏会</option>
<option value="1387">ACA CMO158 - 比赛 - 2024年第十二届陈嘉庚陈六使青少年发明奖</option>
<option value="1388">ACA CMO159 - 比赛 - 第一届谢师恩征文比赛</option>
<option value="1389">ACA CMO160 - 比赛 - 2024第五届全国母亲节颂文比赛（森州芙蓉区）</option>
<option value="1390">ACA CMO161 - 比赛 - 2024 XMUM CUP physics Competition</option>
<option value="1391">ACA CMO163 - CAMP - 独中生物营</option>
<option value="1392">ACA CMO164 - 比赛 - 2024 Ultimate Art Clash:National HOK Art Competition</option>
<option value="1393">PE CMO145 - CAMP - 2024年3月份芙蓉中华中学田径校队集训</option>
<option value="1394">PE CMO147 - CAMP - 2024年第十三届全国华文独中田径赛森甲彭E区区域交流赛生活营</option>
<option value="1395">PE CM0146 - CAMP - 2024年4月份芙蓉中华中学田径校队集训</option>
<option value="1396">ACA CMO166 - 比赛 - APCYTA亚太儿童及青少年优才协会</option>
<option value="1397">ACA CMO169 - 比赛 - 全国华文独中三语演讲比赛</option>
<option value="1398">ACA CMO165 - 比赛 - The 8th Chen Jingrun’s Cup Secondary School Mathematics Competition in 2024</option>
<option value="1399">ACA CMO167 - 比赛 - 2024年度第36届雪隆森中学华罗庚杯数学比赛</option>
<option value="1400">CCD CMO467 - 比赛- 2024第20届马来西亚中学生《戏剧奖》戏剧比赛</option>
<option value="1401">ACA CMO168 - 比赛 - Kangaroo Math Competition（KMC）2024</option>
<option value="1402">ACA CMO170 - 比赛 - 2024年第七届吴佳鸿杯马来西亚全国学校数学锦标赛</option>
<option value="1403">ACA CMO174 - 比赛 - 《浓情端午》陆地赛龙舟比赛</option>
<option value="1404">ACA CMO173 - 比赛 - 2024年全校三语演讲比赛</option>
<option value="1405">ACA CMO172 - 比赛 - 2024年全校华语演讲比赛</option>
<option value="1406">ACA CMO171 - 比赛 - 2024年全校散文创作比赛</option>
<option value="1407">ACA CMO175 - 比赛 - 2024年全国华文独中科学营</option>
<option value="1408">ACA CMO176 - 比赛 - 2024年第三十九届成大数理比赛及第三届成大商科比赛</option>
<option value="1409">ACA CMO177 - 比赛 - 2024 Australian Mathematics Competition AMC </option>
<option value="1410">ACA CMO178 - 比赛 - IMONST 2024</option>
<option value="1411">ACA CMO180 - 2025年度校园朗诵争霸赛</option>
<option value="1412">CCD PO88 - 表演- Sunrise MCL Land中秋活动</option>
<option value="1413">CCD PO89 - 表演- 天宫周年、义卖会及爱心捐血运动</option>
<option value="1414">CCD EAO157 - 额外活动- JAMBORI DI UDARA KE-67 TAHUN 2024</option>
<option value="1415">CCD CMI131 - 比赛-2024校庆义卖会班级售卖</option>
<option value="1416">CCD CMO468 - IPOH OPEN DANCE CHAMPIONSHIP</option>
<option value="1417">CCD CMO469 - 2023年第六届“印象福州”大赛（征文中学组）</option>
<option value="1418">CCD CMO470 - CHINESE NEW YEAR UKULELE COMPETITION Category C3  2024</option>
<option value="1419">CCD CMO471 - Choco Albab Kids Colouring Competition</option>
<option value="1420">CCD CMO472 - TALENT SHOWCASE KUALA LUMPUR 2024 </option>
<option value="1421">CCD CMO473 - 2024全球文化艺术盛典</option>
<option value="1422">CCD CMO474 - Selanagor Open Super Cup Dance Championship 2024</option>
<option value="1423">CCD CMO475 - Selanagor Open Super Cup Dance Championship 2024</option>
<option value="1424">CCD CMO476 - MAXXIMA JUNIOR CHALLENGE BADMINTON CHAMPIONSHIP 2024</option>
<option value="1425">CCD CMO477 - 【群龙齐腾旺九州】新春嘉年华挥春比赛</option>
<option value="1426">CCD CMO478 - World Cancer Day Drawing COntest</option>
<option value="1427">CCD CMO479 - &quot;YEAR OF THE DRAGON&quot; PERTANDINGAN KALIGRAFI </option>
<option value="1428">CCD CMO480 - 甲辰龙挥墨舞挥春赛</option>
<option value="1429">CCD CMO481 - 11th Asian Age Group Champions</option>
<option value="1430">CCD CMO482 - 2023年第二届马来西亚全国中学生华文征文比赛</option>
<option value="1431">CCD CMO483 - 1st MILO-MSN-MAS NATIONAL INTER-CLUB WATER POLO CHAMPIONSHIPS-PRESIDDENT CUP</option>
<option value="1432">CCD CMO484 - NCT JUNIOR BADMINTON CHAMPIONSHIP 2024 QUALIFYING ROUND (SELANGOR)</option>
<option value="1433">CCD CMO485 - Back To School Coloring Contest 2024</option>
<option value="1434">CCD CMO486 - Malaysia Olympiad on Astronomy and Astrophysics</option>
<option value="1435">CCD CMO487 - Tech 4 Good Challenge</option>
<option value="1436">CCD CMO488 - Raya Creative Card Contest </option>
<option value="1437">CCD CMO489 - GLAMOUR INTERNATIONAL BALLROOM DANCE CHAMPIONSHIP CHERAS NORTH INTERNATIONAL CONVENTION CENTRE @ CNICC</option>
<option value="1438">CCD CMO490 - UNM OPEN BADMINTON TOURNAMENT 2024 MEN&#039;S SINGLES U14</option>
<option value="1439">CCD CMO491 - Riang Ria Raya Colouring Contest 2024</option>
<option value="1440">CCD CMO492 - 2024全森中小学象棋锦标赛</option>
<option value="1441">CCD CMO493 - Pertandingan Xiang Qi(Catur Cina) Sekolah Rendah&amp;Menengah Negeri Sembilan 2024</option>
<option value="1442">CCD CMO494 - Pertandingan melukis poster berdasarkan pantun(festival pernankan malaysia）</option>
<option value="1443">CCD CMO495 - MILO-DSA-MAS MALAYSIA OPEN 2024 WATER POLO</option>
<option value="1444">CCD CMO496 - Pertandingan Doodle Raya</option>
<option value="1445">CCD CMO497 - GRADE 7 PIANO PERFORMANCE</option>
<option value="1446">CCD CMO498 - KId&#039;s Wau Colouring Contest</option>
<option value="1447">CCD CMO499 - internaltional european music competition 欧洲杯国际音乐艺术dasai</option>
<option value="1448">CCD CMO500 - JUNIOR ELITE TOUR 2024 2ND LEG</option>
<option value="1449">CCD CMO501 - National Series 1</option>
<option value="1450">CCD CMO502 - 2024rethemic gymnastic</option>
<option value="1451">CCD CMO503 - 2024 RETHEMIC GYMNASTIC</option>
<option value="1452">CCD CMO504 - 第五届2024年全国母亲节颂文比赛</option>
<option value="1453">CCD CMO505 - OLYMPIA MATHEMATIC COMPETITION</option>
<option value="1454">CCD CMO506 - kejohanan badminton beregu wanita bawah 13 tahun</option>
<option value="1455">CCD CMO507 - World Mind Innovation League</option>
<option value="1456">CCD CMO508 - 2024至尊国际音乐艺术邀请比赛</option>
<option value="1457">CCD CMO509 - Raya Creative Card Contest</option>
<option value="1458">CCD CMO510 - 甲组 集体自由自选</option>
<option value="1459">CCD CMO511 - 2024年粤漾杯亚太青少年花样游泳邀请赛（甲组  双人自由自选）</option>
<option value="1460">CCD CMO512 - 2024年粤漾杯青少年花样游泳邀请赛（甲组 集体自由自选）</option>
<option value="1461">CCD CMO513 - 2024年粤漾杯亚太青少年花样游泳邀请赛（甲组 50米蛙泳）</option>
<option value="1462">CCD CMO514 - 2024年粤漾杯亚太青少年花样游泳邀请赛（甲组 50米自由泳）</option>
<option value="1463">CCD CMO515 - 2024年粤漾杯亚太青少年花样游泳邀请赛（甲组双人自由自选）</option>
<option value="1464">CCD CMO516 - 2024年粤漾杯亚太青少年花样游泳邀请赛（甲组 集体自由自选）</option>
<option value="1465">CCD CMO517 - 2024年粤漾杯亚太青少年花样游泳邀请赛（甲组 单人自由自选）</option>
<option value="1466">CCD CMO518 - Petandingan Jom Waghih MEwarna Sempana Hari Belia NEGARA2024 Peringkat Negeri Sembilan</option>
<option value="1467">CCD CMO519 - SPORTNET KEJOHANAN BADMINTON KEBANGSAAN 1 2024 BEREGU LELAKI BAWAH 14</option>
<option value="1468">CCD CMO520 - SPORTNET KEJOHANAN BADMINTON KEBANGSAAN 1 2024 PERSEORANGAN LELAKI BAWAH 14</option>
<option value="1469">CCD CMO521 - Mother&#039;s Day Chinese Handwriting Competition</option>
<option value="1470">CCD CMO522 - Pertandingan jom waghih mewarna sempana hari belia negara 2024 peringkjat negeri sembilan</option>
<option value="1471">CCD CMO523 - 孝道尊师全国书法比赛</option>
<option value="1472">CCD CMO524 - 第17届马来西亚华文独中科学营暨天津大学与拉曼大学中学科学营</option>
<option value="1473">CCD CMO525 - kejohanan badminton peseorangan wanita bawah 13 tahun</option>
<option value="1474">CCD CMO526 - 11th Hong Kong International Music Festival</option>
<option value="1475">CCD CMO527 - 2024年全国象棋中小学公开赛</option>
<option value="1476">CCD CMO528 - 香港国际音乐节-vocal（bel canto，popular song）</option>
<option value="1477">CCD CMO529 - 国际青少年鼓乐挑战赛</option>
<option value="1478">CCD CPO61 - 数学巨匠北理大师营</option>
<option value="1479">CCD CMO530 - IPOH OPEN DANCE CHAMPIONSHIP</option>
<option value="1480">CCD CMO531 - 香港国际音乐节</option>
<option value="1481">CCD CMO532 - HONG KONG INTERNATIONAL MUSIC FESTIVAL</option>
<option value="1482">CCD CMO533 - Allegro Ipoh Open Dance Championship 2024</option>
<option value="1483">CCD CMO534 - Kejohanan Wushu Remaja Kebangsaan KE-13 KPM-HIMALAYA SPORTS 2024</option>
<option value="1484">CCD CMO535 - MLAYSIA CHALLENGE CUP DANCE COMPETITION 2024</option>
<option value="1485">CCD CMO536 - 亚洲国际艺术节</option>
<option value="1486">CCD CMO537 - Klang Open International Ballroom Dance Championship 2024</option>
<option value="1487">CCD CMO538 - Youth Camp Leadership 2024</option>
<option value="1488">CCD CMO539 - ns badminton tourment 2024</option>
<option value="1489">CCD CMO540 - 4TH PANS/MILO/MBS/MSN NEGERI SEMBILAN INTER-CLUB (NSIC) (4X100 FREESTSYLE RELAY GIRLS GROUP 1) </option>
<option value="1490">CCD CMO541 - 4th PANS/MILO/MSN NEGERI SEMBILAN INTER-CLUB </option>
<option value="1491">CCD CMO542 - 4TH PANS/MILO/MSN NEGERI SEMBILAN INTER-CLUB</option>
<option value="1492">CCD CMO543 - 游泳</option>
<option value="1493">CCD CMO544 - NEGERI SEMBILAN INTER-CLUB(NSIC) SWIMMING CHAMPIONSHIP 2024</option>
<option value="1494">CCD CMO545 - NEGERI SEMBILAN INTER-CLUB (NSIC) SWIMMING CHAMPIONSHIPS 2024</option>
<option value="1495">CCD CMO546 - 4th PANS/MILO/MBS/MSN NEGERI SEMBILAN INTER-CLUB (NSIC) SWIMMING CHAMPIONSHIPS 2024 (4 x 100M FREESTYLE RELAY GIRLS GROUP 2)</option>
<option value="1496">CCD CMO547 - 4th PANS/MILO/MBS/MSN NEGERI SEMBILAN INTER-CLUB (NSIC) SWIMMING CHAMPIONSHIPS 2024</option>
<option value="1497">CCD CMO548 - 4TH PANS/MILO/MBS/MSN NEGERI SEMBILAN INTER-CLUB (NSIC) (200M FREESTSYLE GIRLS GROUP 1) </option>
<option value="1498">CCD CMO549 - 4TH PANS/MILO/MBS/MSN NEGERI SEMBILAN INTER-CLUB (NSIC) (50m BUTTERFLY GIRLS GROUP 1) </option>
<option value="1499">CCD CMO550 - 4th PANS/MILO/MBS/MSN NEGERI SEMBILAN INTER-CLUB (NSIC) (100M BREASTSTROKE GIRLS GROUP 1)</option>
<option value="1500">CCD CMO551 - 4th PANS/MILO/MBS/MSN NEGERI SEMBILAN INTER-CLUB (NSIC) (200M BREASTSTROKE GIRLS GROUP 1)</option>
<option value="1501">CCD CMO552 - 4TH NSIC SWIMMING CHAMPIONSHIPS 2024</option>
<option value="1502">CCD CMO553 - HONG KONG INTERNATIONAL MATHEMATICAL OLYMPIAD (HKIMO) HEAT</option>
<option value="1503">CCD CMO554 - 4th PANS/MILO/MBS/MSN NEGERI SEMBILAN INTER-CLUB (NSIC) SWIMMING CHAMPIONSHIPS 2024( 100M BUTTERFLY GIRLS GROUP 1)</option>
<option value="1504">CCD CMO555 - 4th PANS/MILO/MBS/MSN NEGERI SEMBILAN INTER-CLUB (NSIC) (50M BREASTSTROKE GIRLS GROUP 1)</option>
<option value="1505">CCD CMO556 - 4th PANS/MILO/MBS/MSN NEGERI SEMBILAN INTER-CLUB (NSIC) (4 x 100M FREESTYLE RELAY GIRLS GROUP 1)</option>
<option value="1506">CCD CMO557 - 陈景润杯中学数学竞赛</option>
<option value="1507">CCD CMO558 - 陈景润杯中学数学竞赛</option>
<option value="1508">CCD CMO559 - 全森赛</option>
<option value="1509">CCD CMO560 - 全森15岁以下青少年男女篮球选拔赛</option>
<option value="1510">CCD CMO561 - Hope Cup Mathematics</option>
<option value="1511">CCD CMO562 - 第35届全国象棋团体锦标赛</option>
<option value="1512">CCD CMO563 - HONGKONG INTERNATIONAL MUSIC FESTIVAL</option>
<option value="1513">CCD CMO564 - 2024年甲辰年画龙现场绘画比赛</option>
<option value="1514">CCD CMO565 - 香港国际音乐节</option>
<option value="1515">CCD CMO566 - 全国中学生暨中华文化常识比赛</option>
<option value="1516">CCD CMO567 - 全国中学生成语暨中华文化常识比赛</option>
<option value="1517">CCD CMO568 - Dragon Boat Festival Nationwide Colouring Contest</option>
<option value="1518">CCD CMO569 - 59th/NSC/MILO Malaysia Invitational Age Group Artistic Swimming Championship 2024</option>
<option value="1519">CCD CMO570 - 59TH MAS/NSC/MILO MALAYSIA INVITATIONAL AGE GROUP SWIMMING CHAMPIONSHIP 2024</option>
<option value="1520">CCD CMO571 - Royal Siam Cup 2024</option>
<option value="1521">CCD CMO572 - 59th MAS/NSC/MILO Malaysia Invitational Age Group Artistic Swimming Championship 2024</option>
<option value="1522">CCD CMO573 - National Series 2</option>
<option value="1523">CCD CMO574 - 2024 RETHEMIC GYMNASTIC</option>
<option value="1524">CCD CMO575 - GSA/RSUC Invitational Swim Meet</option>
<option value="1525">CCD CMO576 - 59th MAS/NSC/MILO Malaysia Invitational Age Group Artistic Swimming Championship 2024(Open Age Group Free Team)</option>
<option value="1526">CCD CMO577 - GSA/RSUC Invitational Swim Meet</option>
<option value="1527">CCD CMO578 - 59th MAS/NSC/MILO Malaysia Invitational Age Group Artistic Swimming Championship 2024（Youth 13-15 Free Routine Duets)</option>
<option value="1528">CCD CMO579 - 59th MAS/NSC/MILO Malaysia Artistic Swimming Championship2024(Junior 15-19 Technical Routine Duets)</option>
<option value="1529">CCD CMO580 - 59th MAS/NSC/MILO Malaysia Artistic Swimming Championship2024(Open Age Group Free Team)</option>
<option value="1530">CCD CMO581 - 59th MAS/NSC/MILO Malaysia Artistic Swimming Championship2024(Open Age Group Mixed Technical Duet)</option>
<option value="1531">CCD CMO582 - 59th MAS/NSC/MILO Malaysia Artistic Swimming Championship2024(Open Age Group Free Team)</option>
<option value="1532">CCD CMO583 - International Talent 24th Warm Activities for Mother&#039;s Day Online Competition (Love Painting)</option>
<option value="1533">CCD CMO584 - 6th heros international taekwondo cup 2024</option>
<option value="1534">CCD CMO585 - 6th heros international taekwondo cup 2024</option>
<option value="1535">CCD CMO586 - MCO2024</option>
<option value="1536">CCD CMO587 - taekwon-do open championship 2024</option>
<option value="1537">CCD CMO588 - Taekwon-Do open CHampionship 2024“I‘M Champion“</option>
<option value="1538">CCD CMO589 - Johor Shining Star Dancesport Championship 2024</option>
<option value="1539">CCD CMO590 - x cup 2024 sendayan</option>
<option value="1540">CCD CMO591 - 柔佛闪亮之星国际标准舞大赛2024</option>
<option value="1541">CCD CMO592 - X Cup</option>
<option value="1542">CCD CMO593 - Johor Shining Star Dancesport Championship 2024</option>
<option value="1543">CCD CMO594 - 2024年第二届TROPICANA象棋锦标赛</option>
<option value="1544">CCD CMO595 - Johor Shining Star Dancesport Championship 2024</option>
<option value="1545">CCD CMO596 - 4TH KUALA LUMPUR 5V5 MINI WATER POLO 2024</option>
<option value="1546">CCD CMO597 - 2024全森武术锦标赛</option>
<option value="1547">CCD CMO598 - GATORADE MVP 3X3 </option>
<option value="1548">CCD CMO599 - CK CLASSIC INTERNATIONAL OPEN TAEKWONDO CHAMPIONSHIP MALAYSIA 2024</option>
<option value="1549">CCD CMO600 - KEJOHANAN TAEKWONDO BAKAT REMAJA JOHOR</option>
<option value="1550">CCD CMO601 - 第18届”心连心“全国中小学生征文比赛</option>
<option value="1551">CCD CMO602 - P.L.A.Y Drawing contes 2024</option>
<option value="1552">CCD CMO603 - 全国中学生成语暨中华文化常识比赛</option>
<option value="1553">CCD CMO604 - 2024一带一路国际武术运动会</option>
<option value="1554">CCD CMO605 - KEJOHANAN AKUATIK MAJLIA SUKAN SUKOLAH NEGERI SEMBILAN (MSSNS)TAHUN2024</option>
<option value="1555">CCD CMO606 - The 8th Crown Cup Open Dance Championship</option>
<option value="1556">CCD CMO607 - Pertandingan mewarna sempena sukan olimpik paris</option>
<option value="1557">CCD CMO608 - 2024一带一路国际武术运动会</option>
<option value="1558">CCD CMO609 - 113年全球侨校学生暨侨生歌唱大赛</option>
<option value="1559">CCD CMO610 - MALAYSIA TOP 10 OUTSTANDING YOUNG ARTISTS AWARD 2024</option>
<option value="1560">CCD CMO611 - 第六届雪隆福州会馆杯中学生象棋锦标赛</option>
<option value="1561">CCD CMO612 - 丹斯里陈金火杯全国书法公开赛</option>
<option value="1562">CCD CMO613 - Malaysia Top 10 Outstanding Young Artist Awards 2024</option>
<option value="1563">CCD CMO614 - 毕加芬2024年夏季绘画大赛</option>
<option value="1564">CCD CMO615 - 绘画比赛</option>
<option value="1565">CCD CMO616 - 113年全球侨校学生暨侨生歌唱大赛</option>
<option value="1566">CCD CMO617 - 113年全球侨校学生暨侨生歌唱大赛</option>
<option value="1567">CCD CMO618 - 6th international heros teakwondo cup2024</option>
<option value="1568">CCD CMO619 - PERTANDINGAN XIANG QI (CATUR CINA) SEKOLAH RENDAH DAN MENENGAH N.S. 2024</option>
<option value="1569">CCD CMO620 - 2024年全森中小学生象棋锦标赛</option>
<option value="1570">CCD CMO621 - 中国舞比赛</option>
<option value="1571">CCD CMO622 - 2024年全森中小学生象棋锦标赛</option>
<option value="1572">CCD CMO623 - pertandingan melukis poster berdasarkan pantun (festival peranakan Malaysia</option>
<option value="1573">CCD CMO624 - CK CLASSIC INTERNATIONAL OPEN TAEKWONDO CHAMPIONSHIP MALAYSIA 2024</option>
<option value="1574">CCD CMO625 - malaysia negeri sembilan international championship 2024</option>
<option value="1575">CCD CMO626 - MALAYSIA NEGERI SEMBILAN INTERNATIONAL DANCESPORT CHAMPIONSHIP 2024</option>
<option value="1576">CCD CMO627 - Negeri Sembilan International Dancesport Championship 2024</option>
<option value="1577">CCD CMO628 - 2024马来西亚森美兰州体育舞蹈国际锦标赛 第13届超级新星国标公开赛</option>
<option value="1578">CCD CMO629 - rockfest  acoustic guitar</option>
<option value="1579">CCD CMO630 - ROCKFEST band</option>
<option value="1580">CCD CMO631 - IPGMY RANKIN BADMINTON LEAGUE 2024 SELANGOR TOUR JUNIOR DOUBLES UNDER15</option>
<option value="1581">CCD CMO632 - Malaysia Negeri Sembilan International Dancesport Championship 2024</option>
<option value="1582">CCD CMO633 - Dancespiratio Open 2024</option>
<option value="1583">CCD CMO634 - IJM FUN RUN</option>
<option value="1584">CCD CMO635 - 第11届香港国际音乐节</option>
<option value="1585">CCD CMO636 - global children and youth art competition</option>
<option value="1586">CCD CMO637 - 第11届香港国际音乐节2024</option>
<option value="1587">CCD CMO638 - INTERNATIONAL CHEMISTRY QUIZ</option>
<option value="1588">CCD CMO639 - 20TH Crystal International Dancesport Championships</option>
<option value="1589">CCD CMO640 - 亚洲国际艺术节</option>
<option value="1590">CCD CMO641 - 2024年Mesamall中小学生象棋锦标赛团体赛</option>
<option value="1591">CCD CMO642 - 20th crystal international dancesport championship </option>
<option value="1592">CCD CMO643 - 慈济大学马来西亚生物营</option>
<option value="1593">CCD CMO644 - 2024年YB方贵伦杯暨雪州青年团全国象棋国庆赛</option>
<option value="1594">CCD CMO645 - The 4th Kuala Lumpur City International Ballroom Dance Championship 2024</option>
<option value="1595">CCD CMO646 - 2024 1st Anniversary Colouring Contest</option>
<option value="1596">CCD CMO647 - pertandingan mewarna hari kebangsaaan 2024</option>
<option value="1597">CCD CMO648 - 2024年全森中小学生象棋锦标赛</option>
<option value="1598">CCD CMO649 - ”YB SYED AHMAD杯“安邦全国象棋赛</option>
<option value="1599">CCD CMO650 - Pandai Colouring Contest 2024 #Semarakmerdeka</option>
<option value="1600">CCD CMO651 - Nationwide National Day Creative Colouring Contest</option>
<option value="1601">CCD CMO652 - NSSPC 2024 台大杯全国中学生程式设计比赛</option>
<option value="1602">CCD CMO653 - Nationwide Playing Badminton Colouring Contest</option>
<option value="1603">CCD CMO654 - hari malaysia drawing contest </option>
<option value="1604">CCD CMO655 - 欢乐中秋书法赛</option>
<option value="1605">CCD CMO656 - 台积电杯青年尬科学科学创意表达竞赛</option>
<option value="1606">CCD CMO657 - 台积电杯青年尬科学创意表达竞赛</option>
<option value="1607">CCD CMO658 - 2024台积电杯青年尬科学 科学创意表达竞赛</option>
<option value="1608">CCD CMO659 - 全森中小学书法比赛</option>
<option value="1609">CCD CMO660 - PERTANDINGAN DEKLAMASI SAJAK FESTIVAL BAHASA DAN SASTERA PERINGKAT KEBANGSAAN</option>
<option value="1610">CCD CMO661 - Pertandingan Deklamasi Sajak Festival Bahasa dan Sastera Peringkat Kebangsaan</option>
<option value="1611">CCD CMO662 - KEJOHANAN BADMINTON MAJLIS SUKAN SEKOLAH MALAYSIA 2024 BEREGU LELAKI B15</option>
<option value="1612">CCD CMO663 - 2024MYTOWN象棋学生赛</option>
<option value="1613">CCD CMO664 - 2024第39届全国华人文化节全国书法比赛</option>
<option value="1614">CCD CMO665 - MAJLIS SUKAN SEKOLAH MALAYSIA</option>
<option value="1615">CCD CMO666 - 成大数理比赛</option>
<option value="1616">CCD CMO667 - seremban prima mall hari malaysia 2024 colouring competition</option>
<option value="1617">CCD CMO668 - Open world dancesport Penang Campionship 2024</option>
<option value="1618">CCD CMO669 - Hari Malaysia 2024 Colouring Competition</option>
<option value="1619">CCD CMO670 - 非凡筑梦杯东方舞节</option>
<option value="1620">CCD CMO671 - ITF TAEKWON-DO NATIONAL CHAMPIONSHIP 2024</option>
<option value="1621">CCD CMO672 - Rentak Kakies Vol 2 2024</option>
<option value="1622">CCD CMO673 - SEREMBAN PRIMA MALL HARI MALAYSIA 2024 COLOURING COMPETITION</option>
<option value="1623">CCD CMO674 - AODC,ASIA OPEN DANCE CHAMPIONSHIP</option>
<option value="1624">CCD CMO675 - &quot;SERI PAJAM&quot;2024年第18届全国象棋青少年锦标赛</option>
<option value="1625">CCD CMO676 - 2024 SINGAPORE INTERNATIONAL TALENT COMPETITION (SRT CATEGORY)</option>
<option value="1626">CCD CMO677 - 台大杯全国中学生程式设计比赛</option>
<option value="1627">CCD CMO678 - 媒完媒了 “媒”你逃不了5.0</option>
<option value="1628">CCD CMO679 - 中秋晚会填色比赛</option>
<option value="1629">CCD CMO680 - pertandingan melukis kids attraction mah2024</option>
<option value="1630">CCD CMO681 - Pertandingan Melukis Kids Attraction MAHA2024</option>
<option value="1631">CCD CMO682 - 《媒玩媒了5.0 “媒”你逃不了》数码媒体生活营</option>
<option value="1632">CCD CMO683 - Kejohanan Bakat Kebangsaan Akuatik Renang(perempuan 12-13 50m Kuak Lentang)</option>
<option value="1633">CCD CMO684 - Kejohanan Bakat Kebangsaan Akuatik Renang (Perempuan 12-13 100M Kuak Lentang)</option>
<option value="1634">CCD CMO685 - 2024 RockFest Music Competition</option>
<option value="1635">CCD CMO686 - KEJOHANAN BAKAT KEBANGSAAN AKUATIK RENANG (PEREMPUAN 14-15 100M KUAK DADA)</option>
<option value="1636">CCD CMO687 - KEJOHANAN BAKAT KEBANGSAAN AKUATIK RENANG (PEREMPUAN 14-15 200M KUAK DADA)</option>
<option value="1637">CCD CMO688 - KEJOHANAN BAKAT KEBANGSAAN AKUATIK RENANG (PEREMPUAN 14-15 50M GAYA BEBAS)</option>
<option value="1638">CCD CMO689 - KEJOHANAN BAKAT KEBANGSAAN AKUATIK RENANG(PEREMPUAN 14-15 50M KUAK DADA)</option>
<option value="1639">CCD CMO690 - KEJOHANAN BAKAT KEBANGSAAN AKUATIK RENANG</option>
<option value="1640">CCD CMO691 - 2024创意绘画比赛中学公开组</option>
<option value="1641">CCD CMO692 - Pertandingan Mewarna Sempena Hari Malaysia bersama Uni Klinik</option>
<option value="1642">CCD CMO693 - KEJOHANAN BAKAT KEBANGSAAN AKUATIK RENANG( PEREMPUAN 16-17 50M GAYA BEBAS)</option>
<option value="1643">CCD CMO694 - KEJOHANAN BAKAT KEBANGSAAN AKUATIK RENANG( PEREMPUAN 16-17 100M KUAK KUPU-KUPU)</option>
<option value="1644">CCD CMO695 - 2024年“嵩耀“杯国庆日森州象棋锦标赛（公开组）</option>
<option value="1645">CCD CMO696 - KEJOHANAN BAKAT KEBANGSAAN AKUATIK RENANG( PEREMPUAN 16-17 50M KUAK KUPU KUPU)</option>
<option value="1646">CCD CMO697 - KEJOHANAN BAKAT KEBANGSAAN AKUATIK RENANG( PEREMPUAN 16-17 100M GAYA BEBAS)</option>
<option value="1647">CCD CMO698 - KEJOHANAN BAKAT KEBANGSAAN AKUATIK RENANG( PEREMPUAN 16-17 200M GAYA BEBAS)</option>
<option value="1648">CCD CMO699 - 2024国际古典音乐大赛</option>
<option value="1649">CCD CMO700 - Ultimate Art Clash: National HOK Art Competition 2024</option>
<option value="1650">CCD CMO701 - Goshin-ryu Karate Championship 2024</option>
<option value="1651">CCD CMO702 - 空手道比赛</option>
<option value="1652">CCD CMO703 - LEGENDS GRAND MASTER SHIVA CUP 2024</option>
<option value="1653">CCD CMO704 - LEGENDS GRAND MASTER SHIVA CUP 2024</option>
<option value="1654">CCD CMO705 - 2024年“嵩耀”杯国庆日森州象棋锦标赛</option>
<option value="1655">CCD CMO706 - ZLBA Badminton Championship 2024</option>
<option value="1656">CCD CMO707 - pertandingan melukis doodle karnival komuniti pesta air 2024</option>
<option value="1657">CCD CMO708 - 月满映童心 乐享迎中秋创意绘画比赛</option>
<option value="1658">CCD CMO709 - 台湾新世代国际音乐比赛</option>
<option value="1659">CCD CMO710 - LEGENDS GM SHIVA CUP</option>
<option value="1660">CCD CMO711 - 2024年Paradigm Mall学生象棋赛</option>
<option value="1661">CCD CMO712 - No Limit To Dance Vol2</option>
<option value="1662">CCD CMO713 - 雪兰莪蒲种德教会明蒲善阁主办2024年中秋绘画填色比赛</option>
<option value="1663">CCD CMO714 - 3x3 gaterode damansara</option>
<option value="1664">CCD CMO715 - YONEX NSBA CUP 2024</option>
<option value="1665">CCD CMO716 - 2024年“IOI杯”全国象棋锦标赛</option>
<option value="1666">CCD CMO717 - 2024年“IOI杯“全国象棋锦标赛</option>
<option value="1667">CCD CMO718 - 7th DANCEMAXX INTERNATIONAL BALLROOM DANCING CHAMPIONSHIP 2024</option>
<option value="1668">CCD CMO719 - 7th Dancemaxx International Dancing Championship 2024</option>
<option value="1669">CCD CMO720 - allianz junior badminton championship</option>
<option value="1670">CCD CMO721 - ALLIANZ JUNIOR BADMINTON CHAMPIONSHIP 2024</option>
<option value="1671">CCD CMO722 - colouring contest &#039;happy diwali&#039;</option>
<option value="1672">CCD CMO723 - deepavali colouring contest</option>
<option value="1673">CCD CMO724 - 厦门物理比赛</option>
<option value="1674">CCD CMO725 - Sepang 3x3 Tournament 2024</option>
<option value="1675">CCD CMO726 - NJCO 2024</option>
<option value="1676">CCD CMO727 - 台湾新世代音乐比赛</option>
<option value="1677">CCD CMO728 - MUDA Grand Final 2024</option>
<option value="1678">CCD CMO729 - 3rd Negeri Sembilan Podium Talent Swimming Championship 2024</option>
<option value="1679">CCD CMO730 - pertandingan doodle</option>
<option value="1680">CCD CMO731 - 中华民族舞蹈</option>
<option value="1681">CCD CMO735 - INTERNATIONAL BELLY DANCE CHAMPIONSHIP</option>
<option value="1682">CCD CMO736 - KEJOHANAN WUSHU（PERINGKAT NEGERI）NEGERI SEMBILAN 2023</option>
<option value="1683">CCD CMO737 - 11th Asian Age Group Champions</option>
<option value="1684">CCD CMO738 - 2024全森中小学象棋锦标赛</option>
<option value="1685">CCD CMO739 - 甲组 集体自由自选</option>
<option value="1686">CCD CMO740 - 甲组男子单人自由自选</option>
<option value="1687">CCD CMO741 - 第四届森州中小学华语诗歌朗诵比赛</option>
<option value="1688">CCD CMO742 - 第四届国际中学生陈嘉庚常识比赛</option>
<option value="1689">CCD CMO743 - Kejohanan Wushu Remaja Kebangsaan KE-13 KPM-HIMALAYA SPORTS 2024</option>
<option value="1690">CCD CMO744 - 4TH PANS/MILO/MSN NEGERI SEMBILAN INTER-CLUB</option>
<option value="1691">CCD CMO745 - 59th/NSC/MILO Malaysia Invitational Age Group Artistic Swimming Championship 2024</option>
<option value="1692">CCD CMO746 - Open Age Group Male Free Routine Solos</option>
<option value="1693">CCD CMO747 - mssd seremban 1</option>
<option value="1694">CCD CMO748 - mssd seremban beregu perempuan bawah 15 tahun</option>
<option value="1695">CCD CMO749 - mssns kejohanan badminton beregu </option>
<option value="1696">CCD CMO750 - mssns kejohanan badminton peseorangan</option>
<option value="1697">CCD CMO751 - MAJLIS SUKAN SEKOLAH MALAYSIA</option>
<option value="1698">CCD CMO752 - IMONST 2024</option>
<option value="1699">CCD CMO753 - YONEX NSBA CUP 2024</option>
<option value="1700">CCD CMO754 - 中华民族舞蹈</option>
<option value="1701">CCD CMO755 - 2024年武术锦标赛</option>
<option value="1702">CCD CMO756 - 2024年“中国寻根之旅”夏（冬）令营</option>
<option value="1703">CCD CMO757 - x cup</option>
<option value="1704">CCD CMO758 - No Limit To Dance Vol2</option>
<option value="1705">CCD EAO158 - 名师有高徒</option>
<option value="1706">CCD CMO759 - 4TH PANS/MILO/MSN NEGERI SEMBILAN INTER-CLUB</option>
<option value="1707">CCD CMO760 - 比赛- 2024年全森中小学华语文艺歌曲比赛</option>
<option value="1708">CCD EAO159 - 额外活动-Mind &amp; STEM Festival振华科学展</option>
<option value="1709">CCD PO90 - Lobak操场中秋节活动</option>
<option value="1710">CCD EAO160 - 额外活动-Sekinchan天文观星</option>
<option value="1711">CCD CMO761 - 比赛-世纪杯扯铃公开赛</option>
<option value="1712">CCD EAO161 - 2024年马来西亚日摄影比赛-颁奖礼</option>
<option value="1713">PE CMO148 - 比赛 - Kejohanan Bola Keranjang MSSM 2024</option>
<option value="1714">CCD PO91 - 《百年黉宇 荟萃启华》百年校庆</option>
<option value="1715">CCD EAO162 - 额外活动-赏心愿Moon宿舍观星活动</option>
<option value="1716">CCD CPO62 - CAMP-峇株吧辖华仁中学交流营</option>
<option value="1717">CCD PO92 - 表演- Eco-shop 供应商颁奖晚宴</option>
<option value="1718">CCD EAO163 - 额外活动 PHOTO WALK</option>
<option value="1719">CCD EAO164 - 额外活动马中印象</option>
<option value="1720">CCD CMO762 - 比赛- 2024年第3届《觉韵杯》鼓艺观摩赛</option>
<option value="1721">CCD EAO165 - 额外活动-尊孔华乐团《往昔·往熙》演奏会</option>
<option value="1722">CCD CPI134 - CAMP-音乐学会《高三叙别会》</option>
<option value="1723">CCD SO16 - 服务-2025 NS CHINESE FOOTBALL UNION CUP</option>
<option value="1724">CCD EAI75 - 额外活动- 华乐团《芙蓉华乐50周年历史走廊》</option>
<option value="1725">CCD EAO166 - 额外活动-天文学会《星溯》天文展</option>
<option value="1726">CCD PO93 - 表演- Daikin 新春晚宴</option>
<option value="1727">CCD CPO63 - CAMP- 第二届森州华乐音乐节演奏会集训营</option>
<option value="1728">CCD CMO763 - 比赛- 2024第12届民俗文化杯全国廿四节令鼓邀请赛</option>
<option value="1729">CCD CPI135 - CAMP- 管乐团《12月份集训营》</option>
<option value="1730">CCD PO94 - 表演- 马来西亚华人旅游业公会新春晚会</option>
<option value="1731">CCD PO95 - 表演- SLB公司90周年晚宴</option>
<option value="1732">CCD PO96 - 2025年墨海翻腾灵蛇献瑞</option>
<option value="1733">CCD SO17 - 服务 - MEUS Anual Dinner 2025 拍摄</option>
<option value="1734">CCD PO97 - 表演 - Majlis Perasmian Program Karnival Tahun Baru Cina</option>
<option value="1735">CCD PO98 - 表演- 森州华团新春团拜</option>
<option value="1736">CCD PI16 - 表演- 2025挥春比赛</option>
<option value="1737">ACA CMO181 - 2025 第41届全森中小学挥春比赛</option>
<option value="1738">CCD CMO764 - 比赛-GALAXY EXPLORER COMPETITION</option>
<option value="1739">CCD CMO765 - 比赛- Malaysia Olympiad on Astronomy and Astrophysics Camp</option>
<option value="1740">CCD PO99 - 表演-Hong Leong Bank SME CNY Dinner</option>
<option value="1741">CCD PO100 - 表演-Tang Togetherness Festival 唐潮春禧</option>
<option value="1742">CCD PO101 - 表演- 李氏家族《新春联欢午宴》</option>
<option value="1743">CCD CPI136 - 2025年 扯铃学会《集训营》</option>
<option value="1744">CCD CPI137 - 2024年 童军团《mini camp 鉴定营》</option>
<option value="1745">CCD CPI138 - 2024年 华乐团《音梦留痕》叙别会</option>
<option value="1746">CCD CPO64 - CAMP-寻星20周年纪念活动</option>
<option value="1747">CCD EAO167 - 额外活动-马六甲培风中学《樂繪花甲》音乐会观演</option>
<option value="1748">CCD CMO766 - 比赛-《爱我母语》国际母语日全国中、小学合唱团歌唱比赛</option>
<option value="1749">CCD CPI139 - CAMP - 2024年 美术学会、吉他社《梦笔琴弦》生活营</option>
<option value="1750">ACA CMO182 - 第五届全森州中小学华语诗歌朗诵比赛</option>
<option value="1751">CCD CMO767 - 比赛 - 世界中学生华语辩论公开赛</option>
<option value="1752">CCD CMO768 - 比赛- MYAO</option>
<option value="1753">PE CMO149 - 比赛 - 森美兰U17男女选拔赛</option>
<option value="1754">PE CMO150 - 比赛 - 2025年全国华人少年足球冠军锦标赛</option>
<option value="1755">CCD CMO769 - 比赛- 2025 年芙蓉 MSSD学联国际象棋锦标赛</option>
<option value="1756">PE CMO151 - 2025年越野学联赛（县赛) Merentas Desa MSSD</option>
<option value="1757">PE CMO152 - 比赛 - 2025年游泳学联赛（MSSNS)</option>
<option value="1758">PE CMO153 - 比赛 - KEJOHANAN MSSD BOLA TAMPAR SEREMBAN 1 2025</option>
<option value="1759">PE CMO154 - 比赛 - 2025年森篮总芙蓉分会 U15男女篮球选拔赛</option>
<option value="1760">PE CMO155 - 比赛 - 2nd Omega Leo &amp; Lion Club of Lukut 88 (芦骨青狮会) BADMINTON</option>
<option value="1761">CCD CPI140 - 2025年 管乐团《3月份训练营及新生营》</option>
<option value="1762">CCD CPI141 - 2025年 戏剧学会筹备营《真情·不变》</option>
<option value="1763">CCD EAI76 - 额外活动 - 厨艺社《创意美食工作坊》</option>
<option value="1764">CCD CPI142 - 2025年 街舞社《Fun式开跳·舞动自我》生活营</option>
<option value="1765">PE CMO156 - 比赛 - BT BINA SMASH OPEN</option>
<option value="1766">PE CMO157 - 比赛 - YBA BADMINTON CHAMPIONSHIP 2025</option>
<option value="1767">PE CMO158 - 比赛 - YONEX SUNRISE NS U13, U18 &amp; VETERAN CHAMPIONSHIPS 2025</option>
<option value="1768">CCD CMI132 - 比赛-校内篮球比赛</option>
<option value="1769">CCD EAI77 - 额外活动 - 华文学会《十二生肖》</option>
<option value="1770">CCD CPO65 - CAMP- 双威大学独中领袖培训营</option>
<option value="1771">PE CMO159 -  比赛 - 2025学联乒乓县赛</option>
<option value="1772">PE CMO160 - 比赛 - 2025年壁球学联（州赛）</option>
<option value="1773">PE CMO161 - 比赛 - 2025学联乒乓州赛</option>
<option value="1774">CCD PO102 - 表演- 《孝亲敬老献爱心-双亲宴席》</option>
<option value="1775">CCD EAO168 - 出游- UNESCO 动物园</option>
<option value="1776">CCD CMO770 - 森美兰篮球总会芙蓉分会男女十五岁及以下篮球选拔赛</option>
<option value="1777">CCD CMO771 - zenith international school colouring competition</option>
<option value="1778">CCD CMO772 - Malaysia Olympiad on Astronomy and Astrophysics</option>
<option value="1779">CCD CMO773 - 传统舞蹈</option>
<option value="1780">CCD CMO774 - GATORADE MVP 3X3 BASKETBALL TOUR</option>
<option value="1781">CCD CMO775 - GATORADE MVP 3X3 BASKETBALL TOUR</option>
<option value="1782">CCD CMO776 - 卡酷少儿天籁新声试音会活动</option>
<option value="1783">CCD CMO777 - 天籁新声</option>
<option value="1784">CCD CMO778 - Negeri Sembilan inter-club (NSIC)</option>
<option value="1785">CCD CMO779 - 46th SEA AQUATICS AGE GROUP CHAMPIONSHIPS 2024(tHAILAND)</option>
<option value="1786">CCD CMO780 - AGG NATIONAL SERIES 2</option>
<option value="1787">CCD CMO781 - peperiksaan dalam pengatahuan praktik peringkat menengah</option>
<option value="1788">CCD CMO782 - ATORADE MVP 3X3 BASKETBALL TOUR </option>
<option value="1789">CCD CMO783 - 田径锦标赛</option>
<option value="1790">CCD CMO784 - SUKMA XXI SARAWAK 2024</option>
<option value="1791">CCD CMO785 - 马来西亚声聚汇演唱新人王</option>
<option value="1792">CCD CMO786 - Taiwan International Music Competition</option>
<option value="1793">CCD CMO787 - MAJLIS SUKAN SEKOLAH MALAYSIA (MSSM) 2024</option>
<option value="1794">CCD CMO788 - 独中田径锦标赛</option>
<option value="1795">CCD CMO789 - pertandingan mewarna dan melukis</option>
<option value="1796">CCD CMO790 - 篮球比赛</option>
<option value="1797">CCD CMO791 - INTERNATIONAL MATHEMATICAL OLYMPIAD NATIONAL SELECTION TEST 1 (IMONST 1) 2024</option>
<option value="1798">CCD CMO792 - 篮球比赛</option>
<option value="1799">CCD CMO793 - UNITE INTERNATIONAL TOURNAMENT</option>
<option value="1800">CCD CMO794 - LEGENDS GRAND MASTER SHIVA CUP 2024</option>
<option value="1801">CCD CMO795 - 篮球比赛</option>
<option value="1802">CCD CMO796 - Taiwan International Music Competition</option>
<option value="1803">CCD CMO797 - kejohanan olahraga</option>
<option value="1804">CCD CMO798 - 韵律操</option>
<option value="1805">CCD CMO799 - Sepang 3x3 tournament </option>
<option value="1806">CCD CMO800 - SPORTEXCEL/MAS/NSC MILO SWIMMING CIRCUIT (GRAND FINAL) 2024</option>
<option value="1807">CCD CMO801 - 台湾新世代国际音乐比赛</option>
<option value="1808">CCD CMO802 - HONG KONG GRAND TROPHY</option>
<option value="1809">CCD CMO803 - ASIAN CHAMPIONSHIPS</option>
<option value="1810">CCD CMO804 - 篮球比赛</option>
<option value="1811">CCD CMO805 - MUDA GRAND FINAL 2024</option>
<option value="1812">CCD CMO806 - 3RD NEGERI SEMBILAN PODIUM TALENT SWIMMING CHAMPIONSHIP 2024</option>
<option value="1813">CCD CMO807 - 少麟篮球杯</option>
<option value="1814">CCD CMO808 - 篮球比赛</option>
<option value="1815">CCD CMO809 - 全球青少年校园歌手大赛</option>
<option value="1816">CCD CMO810 - 2024 国际儿童及青少年结他大赛</option>
<option value="1817">CCD CMO811 - 台湾新世代国际音乐比赛</option>
<option value="1818">CCD CMO812 - Artium Piano Competition &amp; Festival</option>
<option value="1819">CCD CMO813 - MASTA-ORIENTAL POOMSAE CHAMPIONSHIP&amp;CARNIVAL</option>
<option value="1820">CCD CMO814 - 2024马来西亚金艺颁奖典礼</option>
<option value="1821">CCD CMO815 - 森蓝总芙蓉分会十六岁及以下篮球锦标赛</option>
<option value="1822">CCD CMO816 - Asia Pacific International Arts Festival</option>
<option value="1823">CCD CMO817 - PUCHONG  TAEKWONDO CHAMPIONSHIP</option>
<option value="1824">CCD CMO818 - Malaysia Triumph Talent Competition</option>
<option value="1825">CCD CMO819 - 马来西亚世界东方舞艺术节</option>
<option value="1826">CCD CMO820 - THE DUKE OF EDINBURGH INTERNATUONL AWARD</option>
<option value="1827">CCD CMO821 - 2nd Negeri Sembilan Short Course Swimming Championship</option>
<option value="1828">CCD CMO822 - SUKMA XXI Sarawak 2024</option>
<option value="1829">CCD CMO823 - 46th SEA AQUATIC AGE GROUP CHAMPIONSHIPS 2024（Event Free Team）</option>
<option value="1830">CCD CMO824 - MAJLIS SUKAN SEKOLAH MALAYSIA 2024</option>
<option value="1831">CCD CMO825 - 2024香港钢琴节青少年钢琴比赛</option>
<option value="1832">CCD CMO826 - 第14届全国孝亲敬老征文赛</option>
<option value="1833">CCD CMO827 - 46th Sea Aquatics Age Group Championships 2024 </option>
<option value="1834">CCD CMO828 - 中华诗词学会中国古诗词知识大赛</option>
<option value="1835">CCD CMO829 - International Youth Performing Arts Championship 2024</option>
<option value="1836">CCD CMO830 - 亚太区青少年中国历史文化大赛</option>
<option value="1837">CCD CMO831 - SOLO DIVISION-BALLET DANCE</option>
<option value="1838">CCD CMO832 - INTERNATIONAL CHILDREN AND YOUTH DANCE COMPETITION</option>
<option value="1839">CCD CMO833 - 2024国际舞蹈之星大赛</option>
<option value="1840">CCD CMO834 - The Artful Christmas Colouring Contest 2024</option>
<option value="1841">CCD CMO835 - ASIA-PACIFIC CHILDREN AND YOUTH TALENT ASSOCIATION</option>
<option value="1842">CCD CMO836 - Taiwan International Music Competition</option>
<option value="1843">CCD CMO837 - 留学南京大学体验周</option>
<option value="1844">CCD CMO838 - 篮球比赛</option>
<option value="1845">CCD CMO839 - badminton</option>
<option value="1846">CCD CMO840 - 第三届奕潮杯挥春比赛</option>
<option value="1847">CCD CMO841 - Persatuan Penyelamat Kelemasan Malaysia</option>
<option value="1848">CCD CMO842 - Klang菩提禅修巴生绘画比赛</option>
<option value="1849">CCD CMO843 - 林上海集团象棋比赛</option>
<option value="1850">CCD CMO844 - 申达央清宫坛关帝庙“翰墨迎春贺新岁“挥春比赛</option>
<option value="1851">CCD CMO845 - 奕潮杯挥春比赛</option>
<option value="1852">CCD CMO846 - 第3届奕潮杯挥春比赛</option>
<option value="1853">CCD CMO847 - pertandingan kaligrafi sempena tahun bau cina</option>
<option value="1854">CCD CMO848 - 第二届（灵蛇献瑞 挥春纳福）书法比赛</option>
<option value="1855">CCD CMO849 - 2025年蛇年挥春比赛</option>
<option value="1856">CCD CMO850 - 中国象棋比赛</option>
<option value="1857">CCD CMO851 - 2025(瑞蛇盈门昌明展)新春嘉年华挥春赛</option>
<option value="1858">CCD CMO852 - 第30届（墨海翻腾灵蛇献瑞）挥春与填色比赛</option>
<option value="1859">CCD CMO853 - 2025年CENTERPOINT SEREMBAN中国象棋学生锦标赛 </option>
<option value="1860">CCD CMO854 - GAR 2025 Asian Open</option>
<option value="1861">CCD CMO855 - CENTERPOINT CUP 2025 STUDENT CHINESE CHESS (XIANGQI) CHAMPIONSHIP </option>
<option value="1862">CCD CMO856 - 瑞蛇呈祥挥春赛</option>
<option value="1863">CCD CMO857 - Pertandingan Mewarna CNY 2025</option>
<option value="1864">CCD CMO858 - GROUP DIVISION-CHINESE DANCE</option>
<option value="1865">CCD CMO859 - chinese new year competition ”chinese new year 2025&quot;</option>
<option value="1866">CCD CMO860 - GAME ON School Holiday Colouring Contest</option>
<option value="1867">CCD CMO861 - 第十三届万友新春象棋锦标赛个人组</option>
<option value="1868">CCD CMO862 - 2025年国际青少年模拟联合国大会——冬季会议</option>
<option value="1869">CCD CMO863 - 第十三届万友新春象棋锦标赛团体组</option>
<option value="1870">CCD CMO864 - 蛇年丰年挥春比赛</option>
<option value="1871">CCD CMO865 - 60TH MILO/PRM MALAYSIA AGE GROUP WATERPOLO CHAPIONSHIPS 2025</option>
<option value="1872">CCD CMO866 - PERTANDINGAN KALIGRAFI ANTARA SEKOLAH-SEKOLAH RENDAH DAN MENENGAH NEGERI SEMBILAN KALI KE-41</option>
<option value="1873">CCD CMO867 - 60th MILO/MAS/NSC MALAYSIA INVITATIONAL AGE GROUP SWIMMING CHAMPIONSHIPS 2025</option>
<option value="1874">CCD CMO868 - INTERNATIONAL CHILDREN AND YOUTH DANCE COMPETITION</option>
<option value="1875">CCD CMO869 - 2025年全森17岁及以下男女篮球选拔赛</option>
<option value="1876">CCD CMO870 - 2025年“无拉港杯”象棋锦标赛</option>
<option value="1877">CCD CMO871 - 蛇舞丰年挥春比赛</option>
<option value="1878">CCD CMO872 - &quot;MEGA 3杯“全国象棋精英赛</option>
<option value="1879">CCD CMO873 - How Can We Prevent Future Wars</option>
<option value="1880">CCD CMO874 - 2025年全森17岁及以下男女篮球选拔赛</option>
<option value="1881">CCD CMO875 - 第十届马来西亚道教节花车游行</option>
<option value="1882">CCD CMO876 - 2025世界绿色行动绿色大奖WORLD GREEN MOVEMENT CONTRIBUTION AWARD</option>
<option value="1883">CCD CMO877 - Cultural Dance - Solo (Age 16-17)</option>
<option value="1884">CCD CMO878 - 4th Malaysia Medalist Dancesport Grandprix 2025</option>
<option value="1885">CCD CMO879 - 2025年第三届1 shamelin全国中小学生象棋锦标赛u18</option>
<option value="1886">CCD CMO880 - 1 Shamelin Doodle Battle 2025</option>
<option value="1887">CCD CMO881 - “天后宫英雄杯”第35届全国象棋个人锦标赛</option>
<option value="1888">CCD CMO882 - 1 Shamelin Doodle Battle 2025</option>
<option value="1889">CCD CMO883 - 60TH MALAYSIA INVITATIONAL AGE GROUP WATER POLO CHAMPIONSHIPS 2025</option>
<option value="1890">CCD CMO884 - 60th MAS/NSC/MILO Malaysia Invitational Age Group Artistic Swimming Championship 2025</option>
<option value="1891">CCD CMO885 - 4TH NEGERI SEMBILAN MEDALIST DANCE CHAMPIONSHIP 2025</option>
<option value="1892">CCD CMO886 - gymnastics</option>
<option value="1893">CCD CMO887 - Grand Ace Championship 2025  men double u14</option>
<option value="1894">CCD CMO888 - 中华文化常识比赛</option>
<option value="1895">CCD CMO889 - 60th Malaysia Invitational Age Group Artistic Swimming Championship 2025</option>
<option value="1896">CCD CMO890 - 60th MILO/MAS/NSC MALAYSIA INVITATIONAL AGE GROUP SWIMMING CHAMPIONSHIPS 2025</option>
<option value="1897">CCD CMO892 - EUROASIA YOUTH MUSIC FESTIVAL</option>
<option value="1898">CCD CMO893 - 武术</option>
<option value="1899">CCD CMO894 - Pertandingan Mewarna Sempena Hari Raya</option>
<option value="1900">CCD CMO895 - ESG Art Exhibition Drawing Contest</option>
<option value="1901">CCD CMO896 - 2025年全森武术锦标赛</option>
<option value="1902">CCD CMO897 - Limitless u16 championship</option>
<option value="1903">CCD CMO898 - 21TH WATA OPEN INTERNATIONAL TAEKWONDO CHAMPIONSHIP 2025</option>
<option value="1904">CCD CMO899 - ESG Art Exhibition drawing contest</option>
<option value="1905">CCD CMO900 - 2025年知知港双溪文都象棋公开赛</option>
<option value="1906">CCD CMO901 - 2025年重庆市花样游泳锦标赛暨国际公开赛</option>
<option value="1907">CCD CMO902 - 设计negeri sembilan官方壁球队的队服</option>
<option value="1908">CCD CMO903 - 武术</option>
<option value="1909">CCD CMO904 - 2025 Wucui 4.0 Wushu Open Tournament</option>
<option value="1910">CCD CMO905 - 第八届全球华语朗诵大赛</option>
<option value="1911">CCD CMO906 - 母亲节书法比赛</option>
<option value="1912">CCD CMO907 - Johor Shining Star Dancesport Championship</option>
<option value="1913">CCD CMO908 - 卫塞节绘画创意比赛</option>
<option value="1914">CCD CMO909 - 悲智双运 谛造祥和 中小学书法赛</option>
<option value="1915">CCD CMO910 - Pertandingan Pengguna Celik Mewarna Sempena Hari Belia Negara 2025 peringkat Negeri Sembilan</option>
<option value="1916">CCD CMO911 - 2025全国青年日 森州学生中国象棋锦标赛</option>
<option value="1917">CCD CMO912 - NS Official Jersey Design Competition</option>
<option value="1918">CCD CMO913 - 2025悲智双运 谛造祥和 卫塞庆典园游会</option>
<option value="1919">CCD CMO914 - 波德申篮球分会协办全森U15选拔赛</option>
<option value="1920">CCD CMO915 - 2025年双亲节中国象棋欢乐双人棋比赛</option>
<option value="1921">CCD CMO916 - THE MALAYSIA CHALLENGE CUP DANCE COMPETITION 2025</option>
<option value="1922">CCD CMO917 - 至尊国际音乐节 邀请大赛</option>
<option value="1923">CCD CMO918 - NS OFFICIAL JERSEY DESIGN COMPETITION</option>
<option value="1924">CCD CMO919 - Festival Kartun Perpaduan Selangor ‘Muhibah dan Perpaduan&#039;</option>
<option value="1925">CCD CMO920 -  Mahkota Parade Drawing and Colouring Contest 2025</option>
<option value="1926">CCD CMO921 - Asian Elite Dance Competition (Malaysia Regional)</option>
<option value="1927">CCD CMO922 - taekwondo junior championship and sukma selection 2026</option>
<option value="1928">CCD CMO923 - 60TH MILO/PRM MALAYSIA AGE GROUP WATERPOLO CHAPIONSHIPS 2025</option>
<option value="1929">CCD CMO924 - 书法比赛</option>
<option value="1930">CCD CMO925 - KEJOHANAN TAEKWONDO REMAJA KEBANGSAAN MKTA-DBKL 2025</option>
<option value="1931">CCD CMO926 - 2025柔甲森华文独中美诗杯华语辩论赛</option>
<option value="1932">CCD CMO931 - 2025年第27届福联青全中辩（全国决赛）</option>
<option value="1933">CCD CMO928 - 《鼓手云集》廿四节令鼓中学公开赛-2025年</option>
<option value="1934">CCD EAO169 - 2025《中学生》多媒体公民记者</option>
<option value="1935">CCD EAO170 - 额外活动-MRC International Talent Competition 2025</option>
<option value="1936">CCD CPI143 - CAMP- 天文学会《星海征途》新生营</option>
<option value="1937">CCD CMI133 - 比赛- 2025年全校华语演讲比赛</option>
<option value="1938">CCD SI24 - 服务-2025侨委会文化访问团春节亚洲团巡迴访演--芙蓉站</option>
<option value="1939">CCD SI25 - 服务-第15届新马汶小学现场华文创作精英赛</option>
<option value="1940">CCD EAO171 - 额外活动- 史地《波德申一日游》</option>
<option value="1941">CCD EAO172 - 额外活动- 商学会《参观藤业工厂》</option>
<option value="1942">PE CMO162 - 比赛 - 60th MAS/NSC/MILO Malaysia Invitational Age Group Artistic Swimming Championship 2025</option>
<option value="1943">PE CMO163 - 比赛 - 2025年重庆市花样游泳锦标赛暨国际公开赛</option>
<option value="1944">PE CMO164 - 比赛 - Kejohanan Bola Tampar MSSNS 2025</option>
<option value="1945">PE CMO165 - 比赛 - 2025全国壁球学联赛</option>
<option value="1946">PE CMO166 - 比赛 - KEJOHANAN AKUATIK SUKAN MALAYSIA TAHUN 2025</option>
<option value="1947">CCD SI26 - 服务- 2025教师节庆典《桃李生辉》</option>
<option value="1948">CCD CPI144 - CAMP- 华乐团《弦梦初扬》新生营暨集训营</option>
<option value="1949">PE CMO167 - 比赛 - KEJOHANAN AKUATIK SUKAN MALAYSIA TAHUN 2025 （WATER POLO)</option>
<option value="1950">PE CMO168 - 比赛 - Kejohanan Bola Tampar MSSM Peringkat Kebangsaan</option>
<option value="1951">PE CMO169 - 比赛 - 2025年度森美兰U15青少年男女篮球选拔赛</option>
<option value="1952">PE CMO170 - 比赛 - 2025年黄国福教练杯（U17)</option>
<option value="1953">PE CMO171 - 比赛 - 全国系列赛 Aesthetic Group Gymnastics（美学体操）</option>
<option value="1954">PE CMO172 - 比赛 - 第47届东南亚分龄花样游泳锦标赛</option>
<option value="1955">CCD EAO173 - 额外活动- 数学学会《银行博物馆、艺术画廊》</option>
<option value="1956">CCD EAO174 - 额外活动-  天文学会《幼童军学习营》</option>
<option value="1957">CCD EAO175 - 额外活动-  社会服务团《慈济拉务环保教育站参学》</option>
<option value="1958">CCD CPI145 - CAMP- 华文学会《晨星遗韵》</option>
<option value="1959">CCD S7 - 服务-2025年芙蓉中华中小学112校庆晚宴</option>
<option value="1960">CCD SI27 - 服务- 2025年芙蓉中华中小学112周年校庆晚宴	</option>
<option value="1961">CCD PO103 - 表演- 廿四《跨域鼓韵2.0》KL</option>
<option value="1962">CCD PO104 - 表演- 廿四《跨域鼓韵2.0》怡保</option>
<option value="1963">CCD SO18 - 服务 -2025校友会晚宴</option>
<option value="1964">CCD EAI79 - 额外活动 - 《陆地赛龙舟》</option>
<option value="1965">CCD CMI134 - 比赛- 2025年全校散文创作比赛</option>
<option value="1966">CCD SI28 - 服务- 2025校庆庆典</option>
<option value="1967">CCD CMO929 - 比赛 - 2025 卫塞庆典园游会摄影比赛</option>
<option value="1968">CCD EAO176 - 额外活动 - Through Sound And Song 音乐会观演</option>
<option value="1969">CCD EAO177 - 额外活动 - 东京交响乐团演奏会观摩</option>
<option value="1970">PE CMO173 - 比赛 - 2025年田徑学联赛（县赛）</option>
<option value="1971">PE CMO174 - 比赛 - Kejohanan Gimrama MSSNS Tahun 2025</option>
<option value="1972">PE CMO175 - 比赛 - 第44届全森少年赛黄朝恩杯乒乓锦标赛</option>
<option value="1973">CCD CMO930 - 比赛 - 2025年第22届雪隆独中华语辩论赛</option>
<option value="1974">CCD EAO178 - 额外活动 - 戏剧学会《Sextuple Re-Play》观演</option>
<option value="1975">CCD CMO932 - Cakra Classical Chess Tournament Negeri Sembilan</option>
<option value="1976">CCD PO105 - 表演-醒狮《龙腾狮跃，共创辉煌》筹募晚宴</option>
<option value="1977">CCD PO106 - 福州会馆晚宴</option>
<option value="1978">PE CMO176 - 比赛 - Kejohanan Sukan Tenis MSSD Seremban 2025</option>
<option value="1979">CCD EAI80 - 额外活动 - 2025年摄影学会《凌嘉伟视界》摄影讲座</option>
<option value="1980">CCD EAO179 - 额外活动 - 2025年摄影学会《趣夏探古城》</option>
<option value="1981">PE CMO177 - 比赛 - KEJOHANAN BOLA KERANJANG MSSD SEREMBAN 2025</option>
<option value="1982">CCD CPI146 - CAMP- 辩论社《窥辩烽火台》新生营</option>
<option value="1983">CCD CMI135 - 比赛- 2025年校内华语辩论赛《续论杯》</option>
<option value="1984">CCD CMO933 - 南风杯国际华族器乐大赛</option>
<option value="1985">CCD CPO66 - CAMP-吉隆坡坤城中学交流营</option>
<option value="1986">CCD CPI147 - CAMP-柔道学会《初步赏识营》</option>
<option value="1987">CCD EAO180 - 额外活动-2025年扯铃学会《出游活动》</option>
<option value="1988">CCD CMO934 - 比赛 - 2025年第二届全国校际龙狮锦标赛</option>
<option value="1989">CCD CPI148 - CAMP - 2025年 跆拳道社《跆拳·纷呈》生活营</option>
<option value="1990">CCD EAI81 - 额外活动 - 2025年摄影学会《信短情长》教师节售卖明信片活动</option>
<option value="1991">CCD CPI149 - CAMP - 管乐团《9月份训练营》</option>
<option value="1992">CCD CPO67 - CAMP - 第29届柔甲华文独中管乐观摩会</option>
<option value="1993">CCD EAO181 - 月满中秋，情满东华</option>
<option value="1994">CCD CMO935 - 比赛 - 辩论社《初学杯5.0》</option>
<option value="1995">CCD CPI150 - CAMP - 2025年音乐学会《循音寻梦》生活营</option>
<option value="1996">PE CMO178 - 2025年田径学联赛（州赛）Olahraga MSSNS</option>
<option value="1997">PE CMO179 - Shuttle Stars 羽球锦标赛</option>
<option value="1998">PE CMO180 - 2025年森美兰篮球学联赛（州赛）MSSNS</option>
<option value="1999">PE CMO181 - Kejohanan Sukan Badminton Sekolah Menengah (MSSD) Seremban 1 Tahun 2025</option>
<option value="2000">PE CMO182 - MABA 3X3 U15 SCHOOL LEAGUE</option>
<option value="2001">PE CMO183 - 比赛 - Kejohanan Badminton (MSSNS) Tahun 2025</option>
<option value="2002">PE CMO184 - 2025年森蓝总芙蓉分会男女14岁以下青少年蓝球锦标赛</option>
<option value="2003">CCD EAO182 - 额外活动-启动礼</option>
<option value="2004">CCD PO108 - 表演-FIBA U16 WOMEN`S ASIA CUP 2025  </option>
<option value="2005">CCD PO107 - 表演-狮源之南洋舞</option>
<option value="2006">CCD PO110 - 表演-LOBAK中秋晚会</option>
<option value="2007">CCD PO109 - 表演-马来西亚国际关公文化节</option>
<option value="2008">CCD CMO936 - 比赛- 管乐团《miwFEST 2025》</option>
<option value="2009">CCD EAO183 - 额外活动-2025年天文学会《星辰之旅》出游</option>
<option value="2010">CCD CMO937 - 比赛- 韵律操</option>
<option value="2011">CCD CMO938 - 比赛- 华总国际器乐大赛</option>
<option value="2012">CCD CMO939 - 比赛- Asia-Pacific Cup</option>
<option value="2013">CCD CMO940 - 比赛- 皇城杯</option>
<option value="2014">CCD EAO184 - 额外活动- 南洋理工大学华乐乐器考级</option>
<option value="2015">CCD EAO185 - 额外活动- 中央音乐学院校外音乐水平等级考试</option>
<option value="2016">CCD CMO941 - 比赛- 2025乙巳年第二届挥春比赛</option>
<option value="2017">CCD CMO942 - 比赛- 乙巳瑞蛇报喜挥春赛</option>
<option value="2018">CCD CMO943 - 比赛- 2025年第十二届国际少年杯音乐比赛-第八级组别</option>
<option value="2019">CCD CMO944 - 比赛- 60th MILO-MAS-NSC MALAYSIA INVITATIONAL AGE GROUP SWIMMING CHAMPIONSHIPS</option>
<option value="2020">CCD CMO945 - 比赛- 2025年国际儿童及青少年钢琴公开赛</option>
<option value="2021">CCD CMO946 - 比赛- 2025年全球儿童及青少年钢琴大赛</option>
<option value="2022">CCD CMO947 - 比赛- 2025年亚太区儿童及青少年钢琴大赛 春季赛</option>
<option value="2023">CCD CMO948 - 比赛- PERTANDINGAN XIANG QI (CATUR CINA) SEKOLAH RENDA&amp;MENEGAH N.S 2025</option>
<option value="2024">CCD CMO949 - 比赛- 2025年国际儿童及青少年钢琴公开赛</option>
<option value="2025">CCD CMO950 - 比赛- 2025 GLOBAL CHILDREN AND YOUTH CHINESE CALLIGRAPHY COMPETITION</option>
<option value="2026">CCD CMO951 - 比赛- 2025全国学艺比赛</option>
<option value="2027">CCD CMO952 - 比赛- International Piano Music Star Competition</option>
<option value="2028">CCD CMO953 - 比赛- 2025年全森武术锦标赛</option>
<option value="2029">CCD CMO954 - 比赛- 2025年全少儿武术赛</option>
<option value="2030">CCD CMO955 - 比赛- 67th MILO-MAS MALAYSIA OPEN SWIMMING CHAMPIONSHIPS 2025</option>
<option value="2031">CCD CMO956 - 比赛- 2025 Wucui 4.0 Wushu Open Tournament</option>
<option value="2032">CCD CMO957 - 比赛- Colouring and Drawing Competition 2025</option>
<option value="2033">CCD CMO958 - 比赛- 黄锺奖2025世界古筝大赛</option>
<option value="2034">CCD CMO959 - 比赛- 母亲节书法比赛</option>
<option value="2035">CCD CMO960 - 比赛- 2025年卫塞节“悲智双运，缔造祥和”中小学书法赛</option>
<option value="2036">CCD CMO961 - 比赛- 2nd Negeri Sembilan Age Group Finswimming Championship</option>
<option value="2037">CCD CMO962 - 比赛- 卫塞庆典园游会书法赛</option>
<option value="2038">CCD CMO963 - 比赛- 香港国际音乐节</option>
<option value="2039">CCD CMO964 - 比赛- MAJLIS SUKAN SEKOLAH MALAYSIA</option>
<option value="2040">CCD CMO965 - 比赛- THE MALAYSIA CHALLENGE CUP DANCE COMPETITION 2025</option>
<option value="2041">CCD CMO966 - 比赛- 至尊国际音乐节 邀请大赛</option>
<option value="2042">CCD CMO967 - 比赛- 2025 Klang Open International Ballroom Dance Championship</option>
<option value="2043">CCD CMO968 - 比赛- 2025亚洲国际记录大全</option>
<option value="2044">CCD CPO68 - CAMP- 2025第十六届【携手同圆】中学佛学会三好领袖培训营</option>
<option value="2045">CCD CPO69 - CAMP-2025年吉他学会《吉音共享》交流营</option>
<option value="2046">CCD CPO70 - CAMP- 年少的我生活营</option>
<option value="2047">CCD CMO969 - 比赛- 亚洲国际艺术节</option>
<option value="2048">CCD EAO186 - 额外活动-Meniti Cakerawala 2.0</option>
<option value="2049">CCD CMO970 - 比赛- Festival Kartun Perpaduan Selangor‘Muhibah dan Perpaduan&#039;</option>
<option value="2050">CCD CMO971 - 比赛- Mahkota Parade Drawing and Colouring Contest 2025</option>
<option value="2051">CCD CMO972 - 比赛- ELITE TAEKWONDO CHAMPIONSHIP 2025</option>
<option value="2052">CCD CMO973 - Voices in Bloom 韵徉之声</option>
<option value="2053">CCD CMO974 - 比赛- 59th MABA-MATRIX U17&amp;Below National Basketball Championship 2025</option>
<option value="2054">CCD CMO975 - 比赛- aqua champs</option>
<option value="2055">CCD CMO976 - 比赛- MAS/NSC/MILO Splash Swim Series 2025 1st Leg</option>
<option value="2056">CCD CMO977 - 比赛- 2025年第一届“亚沙杯”全森中小学生象棋校际团体赛</option>
<option value="2057">CCD CMO978 - 比赛- 2025年 Visionaire 全国中小学生象棋锦标赛</option>
<option value="2058">CCD CMO979 - 比赛- 2025年春季毕加芬绘画比赛</option>
<option value="2059">CCD CMO980 - 比赛- Youth Stem Cup 2025：Discoveries through the Eras！</option>
<option value="2060">CCD CMO981 - 比赛- AGG NATIONAL SERIES</option>
<option value="2061">CCD CMO982 - 比赛- 韵律操</option>
<option value="2062">CCD CMO983 - 比赛- 2025 Parent&#039;s Day Colouring Competition</option>
<option value="2063">CCD CMO984 - 比赛- 47th SEA AGE GROUP AQUATICS CHAMPIONSHIPS</option>
<option value="2064">CCD CMO985 - 比赛- 亚太儿童及青少年优才协会</option>
<option value="2065">CCD CMO986 - 比赛- TYC Taekwondo Championship(TM/WT) 2025</option>
<option value="2066">CCD CMO987 - 比赛- 第4届东武传奇武术锦标赛——赛博朋克</option>
<option value="2067">CCD CMO988 - 比赛- 2025年马来西亚云顶国际珠心算</option>
<option value="2068">CCD CMO989 - 比赛- RockFest2025</option>
<option value="2069">CCD CMO990 - 比赛- Pesta Sukan</option>
<option value="2070">CCD CMO991 - 比赛- 亚洲少儿艺术人才国际大奖赛马来西亚吉隆坡吉隆坡赛区少儿组唱歌比赛</option>
<option value="2071">CCD CMO992 - 比赛- World Belly Goddess Festival</option>
<option value="2072">CCD CMO993 - 比赛- 5TH PANS/MILO/MSN NEGERI SEMBILAN INTER-CLUB (NSIC) SWIMMING CHAMPIONSHIPS 2025</option>
<option value="2073">CCD CMO994 - 比赛- Kuala Lumpur Open Dance Championship 2025</option>
<option value="2074">CCD CMO995 - 比赛- 5TH PANS/MILO/MSN NEGERI SEMBILAN INTER-CLUB (NSIC) SWIMMING CHAMPIONSHIPS 2025</option>
<option value="2075">CCD CMO996 - 比赛- Kejohanan TaeKwon-Do (MITF) Jemputan Ketua Polis Kuala Lumpur 2025</option>
<option value="2076">CCD CMO997 - 比赛- 晏斗竹林MLE三人篮球赛</option>
<option value="2077">CCD CMO998 - 比赛- Reka Cipta -Kenderaan</option>
<option value="2078">CCD CMO999 - 比赛- 神墨杯</option>
<option value="2079">CCDCMO1000 - 比赛- Sunway National AI Competition</option>
<option value="2080">CCDCMO1001 - 比赛- swimming competition</option>
<option value="2081">CCDCMO1002 - 比赛- 2025年第2届1 Shamelin 全国象棋个人公开赛</option>
<option value="2082">CCDCMO1003 - 比赛- 第7届雪隆福州会馆杯中学生象棋锦标赛</option>
<option value="2083">CCDCMO1004 - 比赛- 2025 Bloomsvale Sport Stacking Championships (amateur)</option>
<option value="2084">CCD PI17 - 表演 - 2025年芙蓉中华中小学112校庆庆典</option>
<option value="2085">CCDCMO1005 - 比赛- 2025年全森中小学象棋个人锦标赛</option>
<option value="2086">CCDCMO1006 - 比赛- SPORTEXCEL-MILO-NSC-MAS SWIMMING CIRCUIT LEG 2 2025(CENTRAL REGION)</option>
<option value="2087">CCDCMO1007 - 比赛- 2025年【Mesamall】中小学生西洋棋锦标赛 快棋赛</option>
<option value="2088">CCDCMO1008 - 比赛- LE UKE</option>
<option value="2089">CCDCMO1009 - 比赛- 华星小记者集结营 视频创作比赛</option>
<option value="2090">CCDCMO1010 - 比赛- 小小武术家国际武术邀请赛</option>
<option value="2091">CCDCMO1011 - 比赛- Kejohanan Karate Tertutup &amp;Negeri Melaka 2025</option>
<option value="2092">CCDCMO1012 - 比赛- 猫城杯‘2025年第23届全国象棋棋王赛</option>
<option value="2093">CCDCMO1013 - 比赛- 空手道比赛</option>
<option value="2094">CCDCMO1014 - 比赛- 马来西亚中国舞大赛</option>
<option value="2095">CCD CPO71 - CAMP- 吴健雄科学营</option>
<option value="2096">CCDCMO1016 - 比赛- Malaysia Negeri Sembilan INternational Dancesport Championship 2025</option>
<option value="2097">CCDCMO1015 - 比赛- LIMITLESS篮球比赛</option>
<option value="2098">CCDCMO1017 - 比赛- 2025年象棋国际公开快棋赛暨文化交流活动</option>
<option value="2099">CCDCMO1018 - 比赛- ANU STEM CHALLENGES 2025</option>
<option value="2100">CCDCMO1019 - 比赛- Cakra Classical Chess Tournament</option>
<option value="2101">CCDCMO1020 - 比赛- Merdeka With A Roar Colouring Competition 2025</option>
<option value="2102">CCDCMO1021 - 比赛- Superman Colouring Contest 2025</option>
<option value="2103">CCDCMO1022 - 比赛- GAR 2025 China International Open</option>
<option value="2104">CCDCMO1023 - 比赛- 香港国际音乐节(决赛)</option>
<option value="2105">CCDCMO1024 - 比赛- 中国好鼓手</option>
<option value="2106">CCDCMO1025 - 比赛- wukwon taekwondo championship</option>
<option value="2107">CCDCMO1026 - 比赛- 趣墨轩亲子书法比赛</option>
<option value="2108">CCDCMO1027 - 比赛- 青少年智力棋艺挑战赛</option>
<option value="2109">CCD CPI151 - CAMP - 2025年音乐学会《ECHO 18》生活营</option>
<option value="2110">CCDCMO1028 - 比赛- Merdeka Coloring Contest</option>
<option value="2111">CCDCMO1029 - 比赛- 2025年第三届双虎杯</option>
<option value="2112">CCDCMO1030 - 比赛- NSBA President Cup</option>
<option value="2113">CCDCMO1031 - 比赛- Pertandingan Mewarna</option>
<option value="2114">CCDCMO1032 - 比赛- Mykoku Colours of Malaysia Art Competition 2025</option>
<option value="2115">CCDCMO1033 - 比赛- 5th WP Kuala Lumpur Classics 1800</option>
<option value="2116">CCDCMO1034 - 比赛- 66TH MILO-MAS MALAYSIA OPEN WATER PLO CHAMPIOPNSHIPS 2025</option>
<option value="2117">CCDCMO1035 - 比赛- 2025年Mesamall中小学生象棋团体锦标赛</option>
<option value="2118">CCDCMO1036 - 比赛- 南中教区运动会</option>
<option value="2119">CCDCMO1037 - 比赛- 8th malaysia ukulele festival</option>
<option value="2120">CCDCMO1038 - 比赛- Shito-kai Open Karate Championship 2025</option>
<option value="2121">CCDCMO1039 - 比赛- 第四届《文武》武术锦标赛</option>
<option value="2122">CCDCMO1040 - 比赛- THE 4TH DGA CUP</option>
<option value="2123">CCDCMO1041 - 比赛- “saya anak Malaysia ” colouring contest</option>
<option value="2124">CCDCMO1042 - 比赛- 2025 HONOUR CUP ABACUS MENTALMATHS &amp; MATHEMATISC CHAMPIONSHIP</option>
<option value="2125">CCDCMO1043 - 比赛- 第11届安邦再也象棋公开赛公开组</option>
<option value="2126">CCDCMO1044 - 比赛- International Arts Festival （IAF）芭蕾比赛</option>
<option value="2127">CCDCMO1045 - 比赛- 台大杯全国中学生程式设计竞赛</option>
<option value="2128">CCDCMO1046 - 比赛- AI X SDGs HACKATHON COMPETITION</option>
<option value="2129">CCDCMO1047 - 比赛- 4TH Utar Goshin-Ryu Karate Championship 2025</option>
<option value="2130">CCDCMO1048 - 比赛- 4th Negeri Sembilan Podium Talent Swimming Championship 2025</option>
<option value="2131">CCDCMO1049 - 比赛- 6th Asia Open Dance Championship 2025</option>
<option value="2132">CCDCMO1050 - 比赛- INTERNATIONAL YOUTH ACADEMIC ELITE ASSOCIATION</option>
<option value="2133">CCDCMO1051 - 比赛- 第3届世界象棋快棋公开赛</option>
<option value="2134">CCDCMO1052 - 比赛- WSE ATHLETICS OPEN (kuala Lumpur)</option>
<option value="2135">CCDCMO1053 - 比赛- 农行杯第5届世界青少年象棋锦标赛</option>
<option value="2136">CCDCMO1054 - 比赛- Gamuda Walk Mall Colouring Competition</option>
<option value="2137">CCDCMO1055 - 比赛- 16th Annual Global Maths Abacus &amp;Mental Arithmetic Competition 2025</option>
<option value="2138">CCDCMO1056 - 比赛- 2025年马来西亚象棋教育杯MSXQ</option>
<option value="2139">CCDCMO1057 - 比赛- 11th IMU Science Discovery Challenge 2025</option>
<option value="2140">CCD CPO72 - CAMP-天文学会交流营《星澜之约》</option>
<option value="2141">CCD CPO73 - CAMP-2025年芙蓉中华中学戏剧学会大型公演演出《真情不变》筹备营</option>
<option value="2142">CCDCMO1058 - 比赛-第三届《高学杯》全国中学辩论赛</option>
<option value="2143">CCDCMO1059 - 比赛 - 2025年度全森中小学华语文艺歌曲歌唱比赛</option>
<option value="2144">CCD PO111 - 表演 - 承韻50金禧演唱会</option>
<option value="2145">CCDCMO1060 - 比赛- Kejohanan Majlis Sukan Daerah（MSSD）Seremban 1 Kali ke-12Tahun2025</option>
<option value="2146">CCD EAO187 - 交流- 沙巴山打根育源独立中学管乐团&amp;芙中管乐团交流</option>
<option value="2147">CCD EAO188 - 额外活动-2025年民航飞行社参观飞行学院</option>
<option value="2148">CCD CPI152 - CAMP- 管乐团 《5月份训练营》</option>
<option value="2149">CCD EAO189 - 额外活动-2025年弈棋学会《尊孔棋艺与芙中弈棋交流会》</option>
<option value="2150">CCDCMO1062 - 比赛- 韵律操</option>
<option value="2151">CCDCMO1061 - 比赛-台大校友会-第五届全国中学生程式设计竞赛</option>
<option value="2152">CCDCMO1063 - 比赛-Singapore Raffles International Music Festival</option>
<option value="2153">CCDCMO1064 - 比赛-Hackathon2025</option>
<option value="2154">CCD SI29 - 服务-牙刷筹款</option>
<option value="2155">CCD SI30 - 服务-HPV打针义工</option>
<option value="2156">CCD SI31 - 服务-初三体检&amp;破伤风</option>
<option value="2157">CCD SI32 - 服务-成年礼</option>
<option value="2158">CCD SO19 - 服务-林晃昇公祭礼</option>
<option value="2159">CCD SO20 - 服务-丰台湾</option>
<option value="2160">CCD SO21 - 服务-福州会馆</option>
<option value="2161">CCDCMO1065 - 比赛 - 模特与西天宫之美摄影比赛</option>
<option value="2162">CCD PO112 - 表演 - 星云MV录制</option>
<option value="2163">CCDCMO1066 - 比赛- Aloha Colouring Contest </option>
<option value="2164">CCDCMO1067 - 比赛- Superman Mega Colouring Contest</option>
<option value="2165">CCDCMO1068 - 比赛-“Malaysia Madani,Rakyat disantuni” Poster  Drawing Contest</option>
<option value="2166">CCDCMO1069 - 比赛- Poster Kemerdekaan</option>
<option value="2167">CCDCMO1070 - 比赛- Colour-lah Merdeka Colouring Contest</option>
<option value="2168">CCDCMO1071 - 比赛- Pertandingan Mewarna Bersempena  Kempen Anti Pemerdagangan manusia &amp;  Penyeludupan Migran</option>
<option value="2169">CCDCMO1072 - 比赛- Saya Anak Malaysia Colouring Contest </option>
<option value="2170">CCDCMO1073 - 比赛- Malaysia Day Colouring Contest </option>
<option value="2171">CCDCMO1074 - 比赛- Gokko Colouring Contest </option>
<option value="2172">CCDCMO1075 - 比赛- 林上海传承杯绘画比赛</option>
<option value="2173">CCDCMO1076 - 比赛- 全国华文戏剧概念比赛</option>
<option value="2174">CCDCMO1077 - 比赛- 2025年马来西亚象棋教育杯MSXQ总决赛</option>
<option value="2175">CCDCMO1078 - 比赛- Nexstar International Rhytmic Gymnastics Competition 2025</option>
<option value="2176">CCDCMO1079 - 比赛- U6,U8,U10,Pre-Junior , Junior &amp; Senior Rhythmic Gymnastics Group Exercise Campionships 2025</option>
<option value="2177">CCDCMO1080 - 比赛- 上海国际总展演</option>
<option value="2178">CCDCMO1081 - 比赛- 47th SEA AGE GROUP AQUATICS CHAMPIONSHIPS SINGAPORE 2025</option>
<option value="2179">CCDCMO1082 - 比赛- KEJOHANAN AKUATIK MAJLIS SUKAN SEKOLAH NEGERI SEMBILAN(MSSNS) TAHUN 2025</option>
<option value="2180">CCDCMO1083 - 比赛- Long Program Junior </option>
<option value="2181">CCDCMO1084 - 比赛- 2025森州全国华教常识线上比赛</option>
<option value="2182">CCDCMO1085 - 比赛- YPAC 全球文化艺术锦标赛</option>
<option value="2183">CCDCMO1086 - 比赛- MALAYSIA TOP10 OUTSTANDING YOUNG ARTISTS AWARD 2025</option>
<option value="2184">CCDCMO1087 - 比赛- 钢琴比赛</option>
<option value="2185">CCDCMO1088 - 比赛- JOM BAKAT 2.0 TALENT COMPETITION</option>
<option value="2186">CCD PI18 - 表演-2025年芙蓉中华中小学112周年校庆晚宴</option>
<option value="2187">CCD PI19 - 表演-2025年台湾明道中学交流活动</option>
<option value="2188">CCDCMO1089 - 比赛-4th Edition of the International Olympiad on Astronomy and Astrophysics - Junior (IOAA - Jr.)</option>
<option value="2189">CCD EAO190 - 额外活动 - KLPF 2025(吉隆坡摄影节2025）</option>
<option value="2190">CCD CMI136 - 比赛 - 2025年音乐学会《芙中好声音·走读赛区》全校独唱比赛</option>
<option value="2191">CCD EAI82 - 额外活动 - 2025年《刻影成忆》摄影展</option>
<option value="2192">CCDCMO1090 - 比赛- 亚洲青锐文化数学比赛</option>
<option value="2193">CCDCMO1091 - 比赛- 2025国际儿童及青少年地理大赛</option>
<option value="2194">CCDCMO1092 - 比赛- 11th IMU SCIENCE DISCOVERY CHALLENGE 2025</option>
<option value="2195">CCDCMO1093 - 比赛- TIMO Heat Round 2026</option>
<option value="2196">CCDCMO1094 - 比赛- HKIMO HEAT ROUND 2025</option>
<option value="2197">CCDCMO1095 - 比赛- NJCO 2025</option>
<option value="2198">CCDCMO1096 - 比赛- MCOPC 2025</option>
<option value="2199">CCDCMO1097 - 比赛- 2025亚太区儿童及青少年中英文写作大赛</option>
<option value="2200">CCDCMO1098 - 比赛- 九井杯算法竞赛集训营</option>
<option value="2201">CCDCMO1099 - 比赛- 2025 XMUM CUP Physics Competition</option>
<option value="2202">CCDCMO1100 - 比赛- 发现稀有海洋生物竞赛</option>
<option value="2203">PE CMO185 - 比赛 - NSBA Seremban Branch U16 Basketball Championship 2025</option>
<option value="2204">PE CMO186 - 6th Innotex Athletics Champions 2025</option>
<option value="2205">PE CMO187 - Kejohanan Badminton MSSM Tahun 2025</option>
<option value="2206">PE CMO188 - 2025年田径公开赛 Sirkit Olaraga Aik Cheong Melaka</option>
<option value="2207">ACA CMO183 - Malaysian Physics Olympiad (OFM) 2025</option>
<option value="2208">ACA CMO184 - 第六届（2025年度）全国母亲节颂文比赛</option>
<option value="2209">ACA CMO185 - 吴健雄纪念奖</option>
<option value="2210">ACA CMO186 - 2025年度全国学术比赛（森州初赛）</option>
<option value="2211">ACA CMO187 - 第六届厦大杯中学物理比赛</option>
<option value="2212">ACA CMO188 - 2025年全国台大杯中学生黑客松竞赛</option>
<option value="2213">ACA CMO189 - 2025年全国OMK 数学比赛(Olympiad Matematik Kebangsaan)</option>
<option value="2214">ACA CMO190 - 2025 澳洲数学比赛</option>
<option value="2215">ACA CMO191 - 2025 IMONST数学比赛</option>
<option value="2216">ACA CMO192 - 2025 吴佳鸿数学比赛</option>
<option value="2217">ACA CMO193 - 2025 Kangaroo Math Competition数学比赛</option>
<option value="2218">ACA CMO194 - 2025年度第37届雪隆森中学华罗庚杯数学比赛</option>
<option value="2219">ACA CMO195 - 2025 MiMAS数学比赛参赛名单</option>
<option value="2220">ACA CMO196 - 2025 SINGAPORE &amp; ASIAN SCHOOL MATH OLYMPAID 2025(SASMO)数学比赛</option>
<option value="2221">ACA CMO197 - 第 18 届马来西亚华文独中科学营</option>
<option value="2222">PE CMO189 - 比赛 - Seremban 2 Badminton Tournament 2023</option>
<option value="2223">PE CMI1 - 2024 芙中运动会</option>
<option value="2224">PE CMO191 - 比赛 - Autumn U16 Basketball Championship 2024</option>
<option value="2225">CCDCMO1101 - Pertandingan &quot;Piala Erat&quot; NS Xiangqi Kumpulan Terbuka 2023</option>
<option value="2226">ACA CMO198 - 2025 台积电杯青年尬科学</option>
<option value="2227">PE CMO192 - 比赛 - Affin 100 Plus Junior Elite Tour (2nd Leg)</option>
<option value="2228">CCD CPO74 - CAMP- Youth Stem Cup</option>
<option value="2229">CCDCMO1102 - 比赛- 2021国油杯</option>
<option value="2230">CCDCMO1103 - 比赛- 2024全国中学生华乐比赛</option>
<option value="2231">CCDCMO1104 - 比赛- 2025全国中学生华乐比赛</option>
<option value="2232">PE CMO193 - 比赛 - Kejohanan Badminton Kebangsaan Bawah 18 Tahun Petronas 2025</option>
<option value="2233">PE CMO194 - 比赛 - 2025年第二届台校虎丘杯足球邀请赛</option>
<option value="2234">PE CMO195 - 比赛 - NBA RISING STARS INVITATIONAL 2025</option>
<option value="2235">CCD CMI137 - 比赛- 2025年全校挥春比赛</option>
<option value="2236">PE CMO196 - 比赛 - 全国学联乒乓锦标赛</option>
<option value="2237">PE CMO197 - Spanish International U19 2025</option>
<option value="2238">PE CMO198 - 比赛 - Kejohanan Olahraga MSSD Seremban 1 ke-11 Tahun 2024</option>
<option value="2239">PE CMO199 - 比赛 - 2025年周显达杯全森新苗乒乓锦标赛</option>
<option value="2240">PE CMI2 - 比赛 - 足球友谊赛</option>
<option value="2241">ACA CMO199 - 2024年全国中学科技创新比赛</option>
<option value="2242">ACA CMO200 - KANGAROO MATH COMPETITION 2024</option>
<option value="2243">ACA CMI131 - 2020年芙蓉中华中学全校散文创作比赛</option>
<option value="2244">ACA CMI132 - 2022年芙蓉中华中学全校散文创作比赛</option>
<option value="2245">ACA CMI133 - 2022年芙蓉中华中学全校英语写作比赛</option>
<option value="2246">CCD CMI138 - 2023年芙蓉中华中学 癸卯年全校挥春比赛</option>
<option value="2247">ACA CMI135 - 2023年芙蓉中华中学 全校高一组英语写作比赛</option>
<option value="2248">ACA CMI136 - 2023年芙蓉中华中学 全校华文大比拼</option>
<option value="2249">ACA CMI137 - 2023年芙蓉中华中学 全校散文创作比赛</option>
<option value="2250">ACA CMI138 - 2024年芙蓉中华中学 感恩卡设计比赛</option>
<option value="2251">PE CMO200 - 比赛 - KEJOHANAN BOLA KERANJANG PIALA MABA/MATRIX BAWAH 17</option>
<option value="2252">ACA CMI139 - 2024年芙蓉中华中学 全校高二组英语写作比赛</option>
<option value="2253">ACA CMI140 - 2025年芙蓉中华中学 高三组英语写作比赛</option>
<option value="2254">PE CMO201 - 比赛 - 47th Sea Age Group 2025</option>
<option value="2255">ACA CMI141 - 2025年芙蓉中华中学 全校散文创作比赛</option>
<option value="2256">ACA CMI142 - 2023 全校华语演讲比赛</option>
<option value="2257">ACA CMO201 - 2025年第四十届成大数理比赛及第四届成大商科比赛</option>
<option value="2258">ACA CMO202 - 2025 Malaysia Chemistry Olympaid Prep Camp (Phase 1)</option>
<option value="2259">ACA CMO203 - 2025 Malaysia Chemistry Olympaid Prep Camp (Phase 2)</option>
<option value="2260">ACA CMO204 - 2025 Malaysia Chemistry Olympaid Prep Camp (Phase 3)</option>
<option value="2261">PE CMO202 - 比赛 - Negeri Sembilan Junior League</option>
<option value="2262">ACA CMI143 - 2025 全校华语演讲比赛</option>
<option value="2263">ACA CMI144 - 2024年芙蓉中华中学 甲辰年全校挥春比赛</option>
<option value="2264">ACA CMI145 - 2020年芙蓉中华中学庚子年全校挥春比赛</option>
<option value="2265">PE CMO203 - U17 3X3 BOYS &amp; GIRLS NATIONAL SELECTION TRIAL</option>
<option value="2266">PE CMO204 - 比赛 - Liga Sukan Komuniti Peringkat Daerah 2025</option>
<option value="2267">PE CMO205 - 比赛 - Kejohanan Tenis MSSNS Tahun 2025</option>
<option value="2268">PE CMO206 - 比赛 - Kejohanan Sukan Bola Sepak Sekolah Menengah MSSD Seremban 1 Tahun 2025</option>
<option value="2269">PE CM0207 - 比赛 - Kejohanan Sukan Institusi Pendidikan Malaysia (SIPMA) Kali Ke-10 Tahun 2025</option>
<option value="2270">ACA CMO205 - 2025年第20届全国华教常识线上比赛</option>
<option value="2271">PE CMO208 - 比赛 - Kejohanan Badminton Berpasukan Negeri Sembilan Yonex Sunrise 2025</option>
<option value="2272">PE CMO209 - 比赛 - Kejohanan Gimrama MSSM Tahun 2025</option>
<option value="2273">PE CMO210 - 比赛 - Kejohanan Bola Keranjang MSSM Tahun 2025</option>
<option value="2274">PE CMO211 - 比赛 - 2ND PRESIDENT CUP WATERPOLO CHAMPIONSHIP 2025</option>
<option value="2275">PE CMO212 - Training Sessions for Event Entertainers/Production Crew - FIBA U16 Women&#039;s Asia Cup 2025</option>
<option value="2276">PE CMO213 - 比赛 - Kejohanan Bola Tampar Niners Lelaki 2025</option>
<option value="2277">PE CMO214 - 比赛 - Kejohanan Polo Air Terbuka Malaysia Anjuran Persekutuan Akuatik Malaysia</option>
<option value="2278">PE CMO215 - 比赛 - Family Fun Run 5KM</option>
<option value="2279">PE CM13 - 芙蓉中华中学与巴生中华独立中学田径校队交流营</option>
<option value="2280">PE CMO216 - 比赛 - O15 Boys Triangular (Volleyball Fixtures Invitation) </option>
<option value="2281">PE CMO217 - 比赛 - Malaysia Day Chinese Youth Cup U16</option>
<option value="2282">PE CMO218 - 比赛 - Kejohanan Liga Bola Tampar Bawah 21 Tahun 2025</option>
<option value="2283">PE CMO219 - 比赛 - Negeri Sembilan Junior League (NSJL) 3rd Leg</option>
<option value="2284">PE CMO220 - 比赛 - Kejohanan Bola Tampar Remaja Bawah 14 Tahun Malaysia 2025</option>
<option value="2285">PE CMO221 - 比赛 - O15 Boys (Volleyball Fixtures Invitation) </option>
<option value="2286">PE CMO222 - 比赛 - Pertandingan Bola Tampar Bawah 14 Tahun Lelaki Antara Kelab Sukan Sekolah-Sekolah N.S 2025</option>
<option value="2287">PE CMO223 - 比赛 - Kejohanan Bola Tampar Daerah Seremban 2025</option>
<option value="2288">PE CMO224 - 比赛 - Tennis Malaysia National Circuit 2025 Leg 4 KL Open</option>
<option value="2289">PE CMO225 - 比赛 - Kejohanan Tennis Malaysia Junior Tour SportExcel 2025 Leg 6 N.S.</option>
<option value="2290">PE CMO226 - 比赛 - 3rd ASIAN YOUTH GAMES BAHRAIN 2025</option>
<option value="2291">PE CMO227 - 比赛 - Kejohanan ASEAN School Games Ke-14 2025</option>
<option value="2292">PE CMO228 - 比赛 - Kejohanan Renang Negeri Sembilan 2025</option>
<option value="2293">PE CMO229 - 比赛 - 乒乓友谊赛</option>
<option value="2294">PE CMO230 - 比赛 - 篮球、羽球与乒乓友谊赛</option>
<option value="2295">PE CMO231 - 比赛 - 15th Rawang Open Badminton Championships</option>
<option value="2296">PE CMO232 - 比赛 - Pertandingan Bola Tampar Bawah 16 Tahun Lelaki dan Perempuan Antara KSSNS Tahun 2025</option>
<option value="2297">CCD CPI153 - CAMP-廿四节令鼓队《新生营》</option>
<option value="2298">CCDCMO1105 - 比赛- 第三届磬艺华语辩论赛</option>
<option value="2299">PE CMO233 - 比赛 - Kejohanan Merentas Desa MSSNS</option>
<option value="2300">PE CMO234 - 比赛 - Kejohanan Olahraga MSSM 2025</option>
<option value="2301">PE CMO235 - 比赛 - WSE 国际田径公开赛</option>
<option value="2302">PE CMO236 - 比赛 - NSBA Seremban Branch U16 Basketball Championship 2025 (Division I)</option>
<option value="2303">PE CMO237 - 比赛 - 13th ASIA PACIFIC OPEN &amp; AGE GROUP ARTISTIC SWIMMING CHAMPIONSHIP 2025</option>
<option value="2304">PE CMO238 - 比赛 - 19th SINGAPORE OPEN ARTISTIC SWIMMING CHAMPIONSHIP 2025</option>
<option value="2305">PE CMO239 - 比赛 - Thailand SEA Games 2025 Artistic Swimming </option>
<option value="2306">CCD PO113 - 表演- 2025年全森民族舞蹈观摩会</option>
<option value="2307">CCD PO114 - 表演 - 2025第四届森周合唱节</option>
<option value="2308">CCD CPO75 - CAMP- 尊孔戏剧学会《永生危机》交流营</option>
<option value="2309">CCD PO115 - 表演- CHHS Christmas Showcase</option>
<option value="2310">CCDCMO1106 - 比赛 - UDO Malaysia Street Dance Championship 2025</option>
<option value="2311">CCDCMO1107 - 比赛-2025年马来西亚第二届《皇城杯》器乐大赛</option>
<option value="2312">CCD CPI154 - CAMP-2025年戏剧学会叙别营《幻兮仙境》</option>
<option value="2313">CCD EAI83 - 额外活动 - 2025 招生展</option>
<option value="2314">PE CMO240 - 比赛 - KARNIVAL BAKAT OLIMPIK KEBANGSAAN</option>
<option value="2315">CCD EAI84 - 额外活动 - 音乐学会《高三叙别会》</option>
<option value="2316">CCD EAI85 - 额外活动 - 2025年音乐学会《祝福》音乐学会</option>
<option value="2317">CCD PO116 - 表演- 2026年双威大学新春庙会</option>
<option value="2318">CCD PO117 - 表演 - HEVEAPAC年会商演</option>
<option value="2319">CCD PO118 - 表演 - HLB CNY Open House</option>
<option value="2320">CCD PO119 - 表演 - 第31届《墨海翻腾》挥春与填色比赛</option>
<option value="2321">CCD PO120 - 表演 - AST 新春市集</option>
<option value="2322">CCD PO121 - 表演 - Bandar Tasik Senangin Open House</option>
<option value="2323">CCD PI20 - 表演 - 2026年招生展</option>
<option value="2324">CCD PI22 - 表演-《艺马当先 马中同行》马中文艺交流晚会</option>
<option value="2325">CCD SI34 - 服务-《艺马当先 马中同行》马中文艺交流晚会</option>
<option value="2326">CCD PI21 - 表演- 2026 新春团拜</option>
<option value="2327">CCD SI33 - 服务 - 2026年招生展</option>
<option value="2328">CCD SI35 - 服务- 2026 新春团拜</option>
<option value="2329">CCD PI23 - 表演 - 2026年全校挥春比赛</option>
<option value="2330">CCD SI36 - 服务 - 2026年全校挥春比赛</option>
<option value="2331">CCD EAO191 - 额外活动-九州文脉市集/九州文化国际时尚盛宴</option>
<option value="2332">CCD PO122 - 表演-Sempena Sambutan Hari Keputeraan KE-78 DYYM YANG DI-PERTUAN BESAR NEGERI SEMBILAN</option>
<option value="2333">CCD PO123 - 表演-Wistron Technology-Management Dinner</option>
<option value="2334">CCD CPI155 - CAMP - 2025年音乐学会《预祝》训练营</option>
<option value="2335">CCDCMO1108 - 比赛- 2026世界中学生华语辩论赛</option>
<option value="2336">CCD SI37 - 服务 - 2026年《新年好马》签唱会</option>
<option value="2337">CCD SI38 - 服务 - 2026年阿牛见面会</option>
<option value="2338">CCD CPO76 - 营会-森州华乐节</option>
<option value="2339">CCD EAO192 - 额外活动 - 2026年辅导团《协助老人院》大扫除</option>
<option value="2340">CCDCMO1109 - 比赛 - 第二届《爱我母语》国际母语日全国中、小学生合唱团双语歌唱比赛</option>
<option value="2341">CCD PO124 - 第三届森州华乐节</option>
<option value="2342">CCD CPO77 - CAMP - 第十六届全国中学生同侪辅导培训营</option>
<option value="2343">CCD CPI156 - CAMP- 管乐团《3月份集训营》</option>
<option value="2344">CCD CPI157 - CAMP-2026戏剧学会新生营之《重启.裂隙之城》</option>
<option value="2345">CCD CPI158 - CAMP - 2026华乐团《韵•相承》新生营</option>
<option value="2346">CCD CMI139 - 比赛- 2026年班级羽球比赛</option>
<option value="2347">CCD CPI159 - CAMP - 2026年街舞社《归舞·入心》生活营</option>
<option value="2348">CCD CPI160 - CAMP - 2026年音乐学会《韶章初响》生活营</option>
<option value="2349">CCDCMO1110 - 比赛- 2025 Piala Pembangunan Oratory Competition</option>
<option value="2350">CCDCMO1111 - 比赛- 2025年第20届全国华教常识线上比赛-森州</option>
<option value="2351">CCDMO1112 - 比赛- Ukulele Festival Malaysia 2025</option>
<option value="2352">CCDCMO1112 - 比赛- Ukulele Festival Malaysia 2025</option>
<option value="2353">CCDCMO1113 - 比赛- STEM Honor Cup Abacus Mental Arithmetic and Mathematics Championship</option>
<option value="2354">CCDCMO1114 - 比赛- 毕加芬秋季庆绘画大赛</option>
<option value="2355">CCDCMO1115 - 比赛- Pertandingan mewarna dan melukis catur cina tahun 2025</option>
<option value="2356">CCDCMO1116 - 比赛- 马来西亚东方舞世界梦想杯2025 2.0</option>
<option value="2357">CCDCMO1117 - 比赛- Artium Piano Competition&amp;Festival Malaysia</option>
<option value="2358">CCDCMO1118 - 比赛- DATO&#039; MALEK CUP</option>
<option value="2359">CCDCMO1119 - 比赛- MAGGA CUP</option>
<option value="2360">CCDCMO1120 - 比赛- THE KLLF JUNIOR SHOWCASE(UNDER 16)</option>
<option value="2361">CCDCMO1121 - 比赛- 2025年“和谐杯”森州象棋锦标赛</option>
<option value="2362">CCDCMO1122 - 比赛- Earth Explorer Competition Secondary Category</option>
<option value="2363">CCDCMO1123 - 比赛- IV International Remote Astronomy Olympiad 2025</option>
<option value="2364">CCDCMO1124 - 比赛- 台湾新时代国际音乐比赛（马来西亚区初赛）</option>
<option value="2365">CCDCMO1125 - 比赛- KL Junior Cup</option>
<option value="2366">CCDCMO1126 - 比赛- MAD WAVE-NS SPRINT CHALLENGE</option>
<option value="2367">CCDCMO1127 - 比赛- 2025年林上海象棋精英挑战赛</option>
<option value="2368">CCDCMO1128 - 比赛- 全国冠中冠象棋邀请赛</option>
<option value="2369">CCDCMO1129 - 比赛- DANZ JOHOR LEAGUE INTERNATIONAL BALLROOM DANSPORT CHAMPIONSHIP 2025</option>
<option value="2370">CCDCMO1130 - 比赛- Olimpiad Fizik Malaysia 2026</option>
<option value="2371">CCDCMO1131 - 比赛- 2025年第1届永春杯中国象棋公开赛</option>
<option value="2372">CCDCMO1132 - 比赛- 33rd Sea Games Thailand 2025</option>
<option value="2373">CCDCMO1133 - 比赛- 皇城杯</option>
<option value="2374">CCDCMO1134 - 比赛- GASCA INTERNATIONAL MUSIC COMPETITON</option>
<option value="2375">CCDCMO1135 - 比赛- 2025年Wanna Cup第29届全国中小学生象棋锦标赛</option>
<option value="2376">CCD CPO78 - CAMP- 2026年青荷少年营初体验</option>
<option value="2377">CCDCMO1136 - 比赛-Malaysian Earth Science Olympiad</option>
<option value="2378">CCDCMO1137 - 比赛- SMASH REIGN CHAMPIONSHIP BADMINTON TOUNARMENT 2026</option>
<option value="2379">CCDCMO1138 - 比赛- 2026 Malaysian Astronomy Olympiad</option>
<option value="2380">CCDCMO1139 - 比赛- Selangor Open Super Cup Dance Championship 2026</option>
<option value="2381">CCDCMO1140 - 比赛- 跆拳道</option>
<option value="2382">CCDCMO1141 - 比赛- 菩提旺旺来开运加持法会亲子填色比赛</option>
<option value="2383">CCDCMO1142 - 比赛- 林上海红包设计比赛</option>
<option value="2384">CCDCMO1143 - 比赛- 华语硬笔比赛</option>
<option value="2385">CCDCMO1144 - 比赛- HYPER JUNIOR CHAMPIONSHIP</option>
<option value="2386">CCDCMO1145 - 比赛- Zoom Kartun 2026 Colouring Contest</option>
<option value="2387">CCDCMO1146 - 比赛- Horse-Perity Lantern Painting Compertition</option>
<option value="2388">CCDCMO1147 - 比赛- 2026年丙午公开挥春赛</option>
<option value="2389">CCDCMO1148 - 比赛- pertandingan Doodle sempena hari terbuka putrajaya 2026</option>
<option value="2390">CCDCMO1149 - 比赛- Chinese New Year Calligraphy Competition</option>
<option value="2391">CCDCMO1150 - 比赛-《马腾盛世 笔舞春风 》书法比赛</option>
<option value="2392">CCDCMO1151 - 比赛- All New X Force Colouring Contest</option>
<option value="2393">CCDCMO1152 - 比赛- Sanctuary Chinese Chess Competition</option>
<option value="2394">CCDCMO1153 - 比赛- 2026年新春儿童绘画比赛</option>
<option value="2395">CCDCMO1154 - 比赛- 61ST MSC/MILO/MAS MALAYSIA INVITATIONAL AGE GROUP SWIMMING CHAMPIONSHIPS 2026</option>
<option value="2396">CCDCMO1155 - 比赛- 丙午年《墨海翻腾马跃新程》挥春与填色比赛</option>
<option value="2397">CCDCMO1156 - 比赛- “ABC恭喜你”MV DANCE CHALLENGE</option>
<option value="2398">CCDCMO1157 - 比赛- Pertandingan Kaligrafi Antara Sekolah-Sekolah Rendah Dan Menenggah Negeri Senbilan Kali-42</option>
<option value="2399">CCDCMO1158 - 比赛- 第14届万友新春象棋锦标赛</option>
<option value="2400">CCDCMO1159 - 比赛- PERTANDINGAN KALIGRAFI ANTARA SEKOLAH-SEKOLAH RENDAH DAN MENENGAH NEGERI SEMBILAN KALI KE-42</option>
<option value="2401">CCDCMO1160 - 比赛- 丙午年公开挥春赛</option>
<option value="2402">CCDCMO1161 - 比赛- 第四届午岁腾辉九州兴丙午挥春比赛</option>
<option value="2403">CCDCMO1162 - 比赛- 第四届奕潮杯挥春比赛</option>
<option value="2404">CCDCMO1163 - 比赛- 全森赛</option>
<option value="2405">CCD CPO79 - CAMP- Kem Remaja Buddha Antara Sekolah -sekolah Menengah Negeri Semilan Kali Ke-19 Tahun 2026</option>
<option value="2406">CCDCMO1164 - 比赛- 1 Shamelin2026年第四届全国中小学象棋锦标赛</option>
<option value="2407">CCDCMO1165 - 比赛- World Championship International Competition 2026</option>
<option value="2408">CCDCMO1166 - 比赛- 第二届儿童青少年武术套路公开赛</option>
<option value="2409">CCDCMO1167 - 比赛- 14th ASIA PACIFIC CUP</option>
<option value="2410">CCDCMO1168 - 比赛- PRO SERIES CHAMPIONSHIP 2026</option>
<option value="2411">CCDCMO1169 - 比赛- 68th Malaysia Open Swimming Championships 2026</option>
<option value="2412">CCDCMO1170 - 比赛- JOHOR TAEKWONDO JUNIOR AND OPEN CHAMPIONSHIP 2026</option>
<option value="2413">CCDCMO1171 - 比赛- MBW JUNIOR TAEKWONDO CHAMPIONSHIP 2026</option>
<option value="2414">CCDCMO1172 - 比赛- KARNIVAL BAKAT OLIMPIK KEBANGSAAN SIRI 1/2026 KEDAH DARUL AMAN</option>
<option value="2415">CCDCMO1173 - 比赛- KEJOHANAN CATUR MSSNS</option>
<option value="2416">CCDCMO1174 - 比赛- 5th NEGERI SEMBILAN MEDALIST DANCE CHAMPIONSHIP 2026</option>
<option value="2417">CCDCMO1175 - 比赛- 中化文化及道德常识比赛</option>
<option value="2418">CCDCMO1176 - 比赛- SEYMF FUROASIA YOUTH MUSIC FESTIVAL</option>
<option value="2419">CCDCMO1177 - 比赛- 14th MAS/NSC/MILO Malaysia Open &amp; Age Group Artistic Swimming Championship 2026(OPEN WOMEN DUET FREE FINAL)</option>
<option value="2420">CCDCMO1178 - 比赛- Negeri Sembilan 2026 Youth Wushu Competition</option>
<option value="2421">CCDCMO1179 - 比赛- AKUATIK MAJLIS SUKAN SEKOLAH NEGERI SEMBILAN (MSSNS) TAHUN 2026</option>
<option value="2422">CCD CPI161 - CAMP-2026扯铃学会新生营</option>
<option value="2423">CCD EAO193 - 额外活动-《马来西亚 x 台湾廿四节令鼓鼓艺交流活动》</option>
<option value="2424">CCD PO080 - 表演-SEMPENA SAMBUTAN HARI KEPUTERAAN KE-78 DYYM YANG DI-PERTUAN BESAR NEGERI SEMBILAN</option>
<option value="2425">CCD PO081 - 表演-WISTRON TECHNOLOGY-MANAGEMENT DINNER</option>
<option value="2426">CCDCMO1180 - 比赛-6TH KUALA LUMPUR CLASSICS 2200</option>
<option value="2427">CCDCMO1181 - 比赛-KEJOHANAN SUKAN CATUR SEKOLAH MENENGAH MAJLIS SUKAN SEKOLAH DAERAH (MSSD)SEREMBAN 1 TAHUN 2026</option>
<option value="2428">CCDCMO1182 - 比赛-PERLAWANAN CATUR PERINGKAT PLAYOFF SEKOLAH RENDAH DAN SEKOLAH MENENGAH MAJLIS SUKAN DAERAH (MSSD)SEREMBAN 1 TAHUN 2026</option>
<option value="2429">CCDCMO1183 - 比赛-LATIHAN PUSAT KONTIJEN CATUR MSSNS 2026</option>
<option value="2430">CCD EAO194 - 额外活动-PERTANDINGAN PERTOLONGAN CEMAS DAN PERAWATAN PERINGKAT NEGERI SEMBILAN TAHUN 2026</option>
<option value="2431">CCDCMO1184 - 比赛-《2026年第七届马来西亚二十四节令鼓全国精英赛（南马区域赛）》</option>
<option value="2432">CCDCMO1185 - 比赛-PELEPASAN PEGAWAI DAN ATLET KE KEHOHANAN PLAYOFF CATUR PEMILIHAN KE MSSM 2026</option>
<option value="2433">CCD SO22 - 服务-“梅江行”活动之医疗协助工作</option>
<option value="2434">CCD CMI141 - 比赛-《3v3班级篮球赛》</option>
<option value="2435">CCD CMI140 - 比赛- 2026年篮球全明星赛</option>
<option value="2436">ACA CMI146 - ENGLISH LANGUAGE ELOCUTION COPETITION</option>
<option value="2437">ACA CMI152 - 2026年全校华语演讲比赛</option>
<option value="2438">ACA CMI147 - ENGLISH ESSAY-WRITING COMPETITION 2026</option>
<option value="2439">ACA CMI148 - TRILINGUAL ELOCUTION COMPETITION</option>
<option value="2440">ACA CMI149 - PERTANDIGAN SYARAHAN BAHASA MELAYU 2026</option>
<option value="2441">ACA CMI150 - 芙蓉中华中学全校散文创作比赛</option>
<option value="2442">ACA CMO206 - 第42届全森中小学挥春观摩赛</option>
<option value="2443">ACA CMI151 - 芙蓉中华中学全校散文创作比赛</option>
<option value="2444">ACA CMO207 - 《马腾盛世，笔舞春风》东天宫书法比赛</option>
<option value="2445">ACA CMO208 - 2026 SASMO数学比赛</option>
<option value="2446">ACA CMO209 - Malaysia international Mathematical Arithmetic for Schools
2026</option>
<option value="2447">PE CMO241 - 比赛 - MAD WAVE - NS SPRINT CHALLENGE</option>
<option value="2448">ACA CMO210 - 第十九届马来西亚华文独中科学营</option>
<option value="2449" selected="selected">ACA CMO211 - 第三届谢师恩征文比赛</option>
<option value="2450">ACA CMO212 - Kangaroo Math Competition (KMC)</option>
<option value="2451">ACA CMO213 - 第九届全球华语朗诵大赛</option>
<option value="2452">ACA CMO214 - Pertandingan Forum Pelajar ( Zon C)</option>
<option value="2453">ACA CMO215 - 2026年第38屆馬來西亞華羅庚杯數學競賽</option>
<option value="2454">ACA CMO216 - 第46屆（2026年）全國獨中三語演講比賽</option>
<option value="2455">CCD EAI86 - 额外活动- 2026年商学会《外出参观生态园》</option>
<option value="2456">CCD CPO80 - CAMP- 双威大学独立中学领袖营</option>
<option value="2457">CCD CPI162 - CAMP- 2026年管乐团《5月份训练营》</option>
<option value="2458">CCDCMO1186 - 比赛 - 2026 九州文脉文化节摄影学习营之摄影比赛</option>
<option value="2459">CCDCMO1187 - 比赛- 第四届高学杯华语辩论赛</option>
<option value="2460">CCD CPI163 - CAMP-2026年影音技术社培训营《ACTION 5.0》</option>
</select></div></div>  </div>
</div>
<div class="row-fluid">
  <div class="span12">
  </div>
</div>





<button onclick="showModal();" class="btn btn-primary" id="yw3" name="yt0" type="button">学生名单</button><br><div class="row-fluid">
  <div class="span12">
    
<div style="overflow:auto;" id="student-performance-m-grid" class="grid-view">
<div class="summary">共 1 条.</div>
<table class="table table-striped table-bordered table-condensed table">
<thead>
<tr>
<th class="span2" style="text-align:center" id="student-performance-m-grid_c0"><a class="sort-link" href="/sms/index.php?r=transaction/studentPerformance/update&amp;StudentPerformanceM%5Bclass_id%5D=693&amp;StudentPerformanceM%5Bitem_id%5D=2449&amp;ajax=student-grid&amp;date=2026-06-06&amp;item_id=2449&amp;id_sort=student_no">学号 </a></th><th class="span3" style="text-align:center" id="student-performance-m-grid_c1"><a class="sort-link" href="/sms/index.php?r=transaction/studentPerformance/update&amp;StudentPerformanceM%5Bclass_id%5D=693&amp;StudentPerformanceM%5Bitem_id%5D=2449&amp;ajax=student-grid&amp;date=2026-06-06&amp;item_id=2449&amp;id_sort=student_name">姓名(英) </a></th><th class="span2" style="text-align:center" id="student-performance-m-grid_c2"><a class="sort-link" href="/sms/index.php?r=transaction/studentPerformance/update&amp;StudentPerformanceM%5Bclass_id%5D=693&amp;StudentPerformanceM%5Bitem_id%5D=2449&amp;ajax=student-grid&amp;date=2026-06-06&amp;item_id=2449&amp;id_sort=student_cname">姓名(中) </a></th><th class="span2" style="text-align:center" id="student-performance-m-grid_c3"><a class="sort-link" href="/sms/index.php?r=transaction/studentPerformance/update&amp;StudentPerformanceM%5Bclass_id%5D=693&amp;StudentPerformanceM%5Bitem_id%5D=2449&amp;ajax=student-grid&amp;date=2026-06-06&amp;item_id=2449&amp;id_sort=class_english_name">班级 </a></th><th class="span2" style="text-align:center" id="student-performance-m-grid_c4"><a class="sort-link" href="/sms/index.php?r=transaction/studentPerformance/update&amp;StudentPerformanceM%5Bclass_id%5D=693&amp;StudentPerformanceM%5Bitem_id%5D=2449&amp;ajax=student-grid&amp;date=2026-06-06&amp;item_id=2449&amp;id_sort=type_of_bonus">奖励分数类型 </a></th><th class="span1" style="text-align:center" id="student-performance-m-grid_c5"><a class="sort-link" href="/sms/index.php?r=transaction/studentPerformance/update&amp;StudentPerformanceM%5Bclass_id%5D=693&amp;StudentPerformanceM%5Bitem_id%5D=2449&amp;ajax=student-grid&amp;date=2026-06-06&amp;item_id=2449&amp;id_sort=mark">备注 </a></th><th class="span2" style="text-align:center" id="student-performance-m-grid_c6"><a class="sort-link" href="/sms/index.php?r=transaction/studentPerformance/update&amp;StudentPerformanceM%5Bclass_id%5D=693&amp;StudentPerformanceM%5Bitem_id%5D=2449&amp;ajax=student-grid&amp;date=2026-06-06&amp;item_id=2449&amp;id_sort=mark">奖励分数 </a></th><th class="span1" style="text-align:center" id="student-performance-m-grid_c7">&nbsp;</th></tr>
</thead>
<tbody>
<tr class="5734 odd">
<td class="span2" style="text-align:center">21403</td><td class="span3">KOH JING HUI<input type="hidden" value="756" name="StudentPerformanceM[inputperformance][5734][class_id]" id="StudentPerformanceM_inputperformance_5734_class_id" /></td><td class="span2" style="text-align:center">许妡泋</td><td class="span2" style="text-align:center">S3A</td><td class="span2"><select data-student_id="5734" name="StudentPerformanceM[inputperformance][5734][type_of_bonus]" id="StudentPerformanceM_inputperformance_5734_type_of_bonus">
<option value=""></option>
<option value="1" selected="selected">校外学艺</option>
<option value="2">特殊表现</option>
</select></td><td class="span1"><textarea cols="2" name="StudentPerformanceM[inputperformance][5734][remark]" id="StudentPerformanceM_inputperformance_5734_remark">散文（高中及毕业生组） 佳作奖</textarea></td><td class="span2"><input class="span12" type="text" value="0.00" name="StudentPerformanceM[inputperformance][5734][mark]" id="StudentPerformanceM_inputperformance_5734_mark" /></td><td class="span1"><input type="hidden" value="5734" name="StudentPerformanceM[1][student_id]" id="StudentPerformanceM_1_student_id" /><div class="btn-group" /><a onclick="delValue(39598, 5734);return false;" class="buttonEdit btn" href="#"><icon class="icon-remove"></icon></a></div></td></tr>
</tbody>
</table>
<div class="keys" style="display:none" title="/sms/index.php?StudentPerformanceM%5Bclass_id%5D=693&amp;StudentPerformanceM%5Bitem_id%5D=2449&amp;ajax=student-grid&amp;date=2026-06-06&amp;item_id=2449&amp;r=transaction%2FstudentPerformance%2Fupdate"><span>39598</span></div>
</div>  </div>
</div>

<div id="StudentList">
    <div style="width:820px;margin-left:-410px;" id="studentModal" class="modal hide fade">    <div class="modal-header">
        <a class="close" data-dismiss="modal">&times;</a>
        <h4>学生名单</h4>
        <hr>
        <input type="hidden" id="filter" value="class">
        <table class="table table-condensed table-bordered" width="80%" align="center">
            <tr>
                <th style="width:20%;">过滤</th>
                <th style="width: 20%;">
                    <label class="radio">
                        <input type="radio" value="class" name="filterS" checked="checked" > 班级                    </label>
                </th>
                <th>
                    <label class="radio">
                        <input type="radio" value="club" name="filterS"> 学会                    </label>
                </th>
            </tr>
            <tr  id="listClass">
                <th>班级</th>
                <th colspan="2">
                    <select onchange="changeGridStudentList();" name="class_id" id="class_id">
<option value="701">初一忠 (J1A)</option>
<option value="693">初一孝 (J1B)</option>
<option value="696">初一仁 (J1C)</option>
<option value="700">初一爱 (J1D)</option>
<option value="704">初一信 (J1E)</option>
<option value="695">初一义 (J1F)</option>
<option value="699">初一和 (J1G)</option>
<option value="703">初一平 (J1H)</option>
<option value="694">初一勤 (J1I)</option>
<option value="697">J1_离校</option>
<option value="691">J1_STAR</option>
<option value="714">初二忠 (J2A)</option>
<option value="706">初二孝 (J2B)</option>
<option value="709">初二仁 (J2C)</option>
<option value="713">初二爱 (J2D)</option>
<option value="705">初二信 (J2E)</option>
<option value="708">初二义 (J2F)</option>
<option value="712">初二和 (J2G)</option>
<option value="715">初二平 (J2H)</option>
<option value="707">初二勤 (J2I)</option>
<option value="711">初二勉 (J2J)</option>
<option value="762">初二诚（J2K）</option>
<option value="763">初二德（J2L）</option>
<option value="710">J2_离校</option>
<option value="692">J2_STAR</option>
<option value="723">初三忠 (J3A)</option>
<option value="726">初三孝 (J3B)</option>
<option value="718">初三仁 (J3C)</option>
<option value="722">初三爱 (J3D)</option>
<option value="725">初三信 (J3E)</option>
<option value="717">初三义 (J3F)</option>
<option value="721">初三和 (J3G)</option>
<option value="724">初三平 (J3H)</option>
<option value="716">初三勤 (J3I)</option>
<option value="720">初三勉 (J3J)</option>
<option value="719">J3_离校</option>
<option value="727">J3_STAR</option>
<option value="738">高一爱 (AC1A)</option>
<option value="730">高一信 (C1A)</option>
<option value="733">高一义 (C1B)</option>
<option value="737">高一和 (C1C)</option>
<option value="729">高一平 (C1D)</option>
<option value="732">高一诚 (C1E)</option>
<option value="736">高一德 (C1F)</option>
<option value="731">高一忠 (S1A)</option>
<option value="734">高一孝 (S1B)</option>
<option value="739">S1_离校</option>
<option value="735">S1_STAR</option>
<option value="728">高一勤 (U1A)</option>
<option value="747">高二爱 (AC2A)</option>
<option value="750">高二信 (C2A)</option>
<option value="742">高二义 (C2B)</option>
<option value="746">高二和 (C2C)</option>
<option value="749">高二平 (C2D)</option>
<option value="741">高二诚 (C2E)</option>
<option value="740">高二忠 (S2A)</option>
<option value="743">高二孝 (S2B)</option>
<option value="748">S2_离校</option>
<option value="744">S2_STAR</option>
<option value="745">高二勤 (U2A)</option>
<option value="761">高三勤 (A3A)</option>
<option value="752">高三爱 (C3A)</option>
<option value="755">高三信 (C3B)</option>
<option value="758">高三义 (C3C)</option>
<option value="751">高三和 (C3D)</option>
<option value="754">高三平 (C3E)</option>
<option value="757">高三诚 (C3F)</option>
<option value="756">高三忠 (S3A)</option>
<option value="759">高三孝 (S3B)</option>
<option value="753">S3_离校</option>
<option value="760">S3_STAR</option>
</select>                </th>
            </tr>
            <tr id="listClub" style="display:none">
                <th>学会</th>
                <th colspan="2">
                    <select onchange="changeGridStudentList();" name="club_id" id="club_id">
<option value="53">乒乓校队</option>
<option value="31">乒乓社</option>
<option value="48">体协会</option>
<option value="4">华乐团</option>
<option value="12">华文学会</option>
<option value="21">厨艺社</option>
<option value="17">史地学会</option>
<option value="11">吉他社</option>
<option value="18">商学会</option>
<option value="41">园艺学会</option>
<option value="13">国文学会</option>
<option value="25">图书馆服务团</option>
<option value="2">圣约翰救伤队</option>
<option value="58">壁球校队</option>
<option value="34">壁球社</option>
<option value="44">大众传播社</option>
<option value="42">天文学会</option>
<option value="65">学联会</option>
<option value="46">学长团</option>
<option value="3">廿四节令鼓队</option>
<option value="40">弈棋学会</option>
<option value="27">影音技术社</option>
<option value="8">戏剧学会</option>
<option value="9">扯铃学会</option>
<option value="59">排球校队</option>
<option value="32">排球社</option>
<option value="39">摄影学会</option>
<option value="15">数学学会</option>
<option value="52">数学校队</option>
<option value="37">柔道社</option>
<option value="56">武术校队</option>
<option value="45">民航飞行社</option>
<option value="57">水球校队</option>
<option value="63">游泳校队</option>
<option value="36">游泳社</option>
<option value="55">田径校队</option>
<option value="35">田径社</option>
<option value="20">电脑学会</option>
<option value="67">礼仪社</option>
<option value="26">社会服务团</option>
<option value="16">科学学会</option>
<option value="1">童军团</option>
<option value="5">管乐团</option>
<option value="60">篮球校队</option>
<option value="29">篮球社</option>
<option value="61">网球校队</option>
<option value="30">网球社</option>
<option value="19">美术学会</option>
<option value="54">羽球校队</option>
<option value="28">羽球社</option>
<option value="50">联协会</option>
<option value="22">联合国教科文组织</option>
<option value="7">舞蹈学会</option>
<option value="14">英文学会</option>
<option value="66">英文辩论校队</option>
<option value="43">街舞社</option>
<option value="62">足球校队</option>
<option value="33">足球社</option>
<option value="38">跆拳道社</option>
<option value="24">辅导团</option>
<option value="64">辩论校队</option>
<option value="23">辩论社</option>
<option value="10">醒狮团</option>
<option value="6">音乐学会</option>
</select>                </th>
            </tr>
        </table>
    </div>
        <div class="modal-body">
        <div id="student-grid" class="grid-view">
<div class="summary">第 1-56 条, 共 56 条.</div>
<table class="table table-striped table-bordered table-condensed table">
<thead>
<tr>
<th class="span2" style="text-align:center" id="student-grid_c0">学号</th><th class="span4" style="text-align:center" id="student-grid_c1">姓名(英)</th><th class="span2" style="text-align:center" id="student-grid_c2">姓名(中)</th><th class="span2" style="text-align:center" id="student-grid_c3">班级</th><th id="student-grid_c4">&nbsp;</th></tr>
<tr class="filters">
<td><div class="filter-container"><input type="text" value="" name="StudentM[student_no]" id="StudentM_student_no" /></div></td><td><div class="filter-container"><input type="text" value="" name="StudentM[student_name]" id="StudentM_student_name" /></div></td><td><div class="filter-container"><input type="text" value="" name="StudentM[student_cname]" id="StudentM_student_cname" /></div></td><td><div class="filter-container"><input type="text" value="" name="StudentM[class_name]" id="StudentM_class_name" /></div></td><td><div class="filter-container">&nbsp;</div></td></tr>
</thead>
<tbody>
<tr class="odd">
<td class="span2" style="text-align:center">26016</td><td class="span4">SIOW YI QING</td><td class="span2" style="text-align:center">萧逸晴</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="8959" data-student_name="SIOW YI QING" data-student_cname="萧逸晴" data-class_name="J1B" data-student_no="26016" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26001</td><td class="span4">WAYNE NG KAH WENG</td><td class="span2" style="text-align:center">吴珈颖</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="8963" data-student_name="WAYNE NG KAH WENG" data-student_cname="吴珈颖" data-class_name="J1B" data-student_no="26001" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26013</td><td class="span4">LIM CHONG CHIZ</td><td class="span2" style="text-align:center">林庄慈</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="8969" data-student_name="LIM CHONG CHIZ" data-student_cname="林庄慈" data-class_name="J1B" data-student_no="26013" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26007</td><td class="span4">TAN WEI QI</td><td class="span2" style="text-align:center">陈微绮</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="8973" data-student_name="TAN WEI QI" data-student_cname="陈微绮" data-class_name="J1B" data-student_no="26007" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26009</td><td class="span4">SAM YI LING</td><td class="span2" style="text-align:center">覃依琳</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="8978" data-student_name="SAM YI LING" data-student_cname="覃依琳" data-class_name="J1B" data-student_no="26009" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26181</td><td class="span4">JOANNE LAW GIA EN</td><td class="span2" style="text-align:center">刘佳恩</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="8983" data-student_name="JOANNE LAW GIA EN" data-student_cname="刘佳恩" data-class_name="J1B" data-student_no="26181" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26015</td><td class="span4">LEE YU HONG</td><td class="span2" style="text-align:center">李昱宏</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="8985" data-student_name="LEE YU HONG" data-student_cname="李昱宏" data-class_name="J1B" data-student_no="26015" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26014</td><td class="span4">AU ZHI QING</td><td class="span2" style="text-align:center">區芓晴</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="8986" data-student_name="AU ZHI QING" data-student_cname="區芓晴" data-class_name="J1B" data-student_no="26014" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26055</td><td class="span4">LUM HIU HYUN</td><td class="span2" style="text-align:center">林晓儇</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="8996" data-student_name="LUM HIU HYUN" data-student_cname="林晓儇" data-class_name="J1B" data-student_no="26055" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26026</td><td class="span4">LOW KEH ENG</td><td class="span2" style="text-align:center">刘可恩</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9011" data-student_name="LOW KEH ENG" data-student_cname="刘可恩" data-class_name="J1B" data-student_no="26026" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26039</td><td class="span4">CHEAH YA XU</td><td class="span2" style="text-align:center">谢雅旭</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9018" data-student_name="CHEAH YA XU" data-student_cname="谢雅旭" data-class_name="J1B" data-student_no="26039" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26186</td><td class="span4">DYLAN CHENG YI CHEN</td><td class="span2" style="text-align:center">莊壹承</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9021" data-student_name="DYLAN CHENG YI CHEN" data-student_cname="莊壹承" data-class_name="J1B" data-student_no="26186" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26321</td><td class="span4">MOK YU HIN</td><td class="span2" style="text-align:center">莫雨轩</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9026" data-student_name="MOK YU HIN" data-student_cname="莫雨轩" data-class_name="J1B" data-student_no="26321" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26241</td><td class="span4">CHEN XIN YOU</td><td class="span2" style="text-align:center">郑世铕</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9027" data-student_name="CHEN XIN YOU" data-student_cname="郑世铕" data-class_name="J1B" data-student_no="26241" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26107</td><td class="span4">LEE HAO ZE</td><td class="span2" style="text-align:center">李昊哲</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9028" data-student_name="LEE HAO ZE" data-student_cname="李昊哲" data-class_name="J1B" data-student_no="26107" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26045</td><td class="span4">FOO JIE ERN</td><td class="span2" style="text-align:center">符洁恩</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9046" data-student_name="FOO JIE ERN" data-student_cname="符洁恩" data-class_name="J1B" data-student_no="26045" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26179</td><td class="span4">CHIN YEE HAN</td><td class="span2" style="text-align:center">陈怡涵</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9061" data-student_name="CHIN YEE HAN" data-student_cname="陈怡涵" data-class_name="J1B" data-student_no="26179" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26300</td><td class="span4">NICHOLAS CHENG ZI HEI </td><td class="span2" style="text-align:center">曾子晞</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9080" data-student_name="NICHOLAS CHENG ZI HEI " data-student_cname="曾子晞" data-class_name="J1B" data-student_no="26300" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26066</td><td class="span4">CHONG KWOK SOON </td><td class="span2" style="text-align:center">庄国舜</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9084" data-student_name="CHONG KWOK SOON " data-student_cname="庄国舜" data-class_name="J1B" data-student_no="26066" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26077</td><td class="span4">LIM KAI SEN</td><td class="span2" style="text-align:center">林楷森</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9114" data-student_name="LIM KAI SEN" data-student_cname="林楷森" data-class_name="J1B" data-student_no="26077" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26078</td><td class="span4">YANG ZHIJIE</td><td class="span2" style="text-align:center">杨智杰</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9129" data-student_name="YANG ZHIJIE" data-student_cname="杨智杰" data-class_name="J1B" data-student_no="26078" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26068</td><td class="span4">NG EREN</td><td class="span2" style="text-align:center">黄奕仁</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9130" data-student_name="NG EREN" data-student_cname="黄奕仁" data-class_name="J1B" data-student_no="26068" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26239</td><td class="span4">WONG XIN EN</td><td class="span2" style="text-align:center">黄歆恩</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9144" data-student_name="WONG XIN EN" data-student_cname="黄歆恩" data-class_name="J1B" data-student_no="26239" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26072</td><td class="span4">SIOW ZHI XUAN</td><td class="span2" style="text-align:center">萧芷璇</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9145" data-student_name="SIOW ZHI XUAN" data-student_cname="萧芷璇" data-class_name="J1B" data-student_no="26072" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26075</td><td class="span4">ANG PUI ERN</td><td class="span2" style="text-align:center">洪沛恩</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9151" data-student_name="ANG PUI ERN" data-student_cname="洪沛恩" data-class_name="J1B" data-student_no="26075" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26129</td><td class="span4">TAN YAN HERZ</td><td class="span2" style="text-align:center">陈彦赫</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9161" data-student_name="TAN YAN HERZ" data-student_cname="陈彦赫" data-class_name="J1B" data-student_no="26129" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26083</td><td class="span4">JACKYLN SHEAH KIM JING</td><td class="span2" style="text-align:center">谢金真</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9164" data-student_name="JACKYLN SHEAH KIM JING" data-student_cname="谢金真" data-class_name="J1B" data-student_no="26083" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26082</td><td class="span4">TAN ZU TAIN</td><td class="span2" style="text-align:center">陳逐天</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9169" data-student_name="TAN ZU TAIN" data-student_cname="陳逐天" data-class_name="J1B" data-student_no="26082" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26198</td><td class="span4">LIM CHIEN LER</td><td class="span2" style="text-align:center">林健乐</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9196" data-student_name="LIM CHIEN LER" data-student_cname="林健乐" data-class_name="J1B" data-student_no="26198" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26407</td><td class="span4">ADELINE LAU YU XIN</td><td class="span2" style="text-align:center">刘宇芯</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9208" data-student_name="ADELINE LAU YU XIN" data-student_cname="刘宇芯" data-class_name="J1B" data-student_no="26407" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26259</td><td class="span4">TONG LI MING  </td><td class="span2" style="text-align:center">汤立酩</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9227" data-student_name="TONG LI MING  " data-student_cname="汤立酩" data-class_name="J1B" data-student_no="26259" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26116</td><td class="span4">LOW SAN HUI</td><td class="span2" style="text-align:center">卢善慧</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9232" data-student_name="LOW SAN HUI" data-student_cname="卢善慧" data-class_name="J1B" data-student_no="26116" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26110</td><td class="span4">LEE ROU JIE </td><td class="span2" style="text-align:center">李柔洁</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9243" data-student_name="LEE ROU JIE " data-student_cname="李柔洁" data-class_name="J1B" data-student_no="26110" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26270</td><td class="span4">ALLEN CHAN JUN HOE</td><td class="span2" style="text-align:center">陈骏皓</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9261" data-student_name="ALLEN CHAN JUN HOE" data-student_cname="陈骏皓" data-class_name="J1B" data-student_no="26270" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26114</td><td class="span4">NG XIN YUN</td><td class="span2" style="text-align:center">黄歆芸</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9266" data-student_name="NG XIN YUN" data-student_cname="黄歆芸" data-class_name="J1B" data-student_no="26114" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26132</td><td class="span4">TERRY CHONG WEE YAO</td><td class="span2" style="text-align:center">张炜耀</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9301" data-student_name="TERRY CHONG WEE YAO" data-student_cname="张炜耀" data-class_name="J1B" data-student_no="26132" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26121</td><td class="span4">LOH MING ZHENG</td><td class="span2" style="text-align:center">罗銘正</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9302" data-student_name="LOH MING ZHENG" data-student_cname="罗銘正" data-class_name="J1B" data-student_no="26121" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26376</td><td class="span4">SOO YONG CHIEN</td><td class="span2" style="text-align:center">苏泳銓</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9309" data-student_name="SOO YONG CHIEN" data-student_cname="苏泳銓" data-class_name="J1B" data-student_no="26376" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26127</td><td class="span4">TING HONG MING</td><td class="span2" style="text-align:center">陈竑铭</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9320" data-student_name="TING HONG MING" data-student_cname="陈竑铭" data-class_name="J1B" data-student_no="26127" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26137</td><td class="span4">WONG KAI XUAN</td><td class="span2" style="text-align:center">汪楷轩</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9322" data-student_name="WONG KAI XUAN" data-student_cname="汪楷轩" data-class_name="J1B" data-student_no="26137" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26148</td><td class="span4">AGNES WONG PEI CI </td><td class="span2" style="text-align:center">王旆骐</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9352" data-student_name="AGNES WONG PEI CI " data-student_cname="王旆骐" data-class_name="J1B" data-student_no="26148" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26154</td><td class="span4">GREYSON TIEW JIN LIN</td><td class="span2" style="text-align:center">张谨淋</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9355" data-student_name="GREYSON TIEW JIN LIN" data-student_cname="张谨淋" data-class_name="J1B" data-student_no="26154" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26167</td><td class="span4">CHOK XUN BEN</td><td class="span2" style="text-align:center">石训斌</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9362" data-student_name="CHOK XUN BEN" data-student_cname="石训斌" data-class_name="J1B" data-student_no="26167" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26348</td><td class="span4">DYLAN TAN YONG SHENG</td><td class="span2" style="text-align:center">陈勇貹</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9382" data-student_name="DYLAN TAN YONG SHENG" data-student_cname="陈勇貹" data-class_name="J1B" data-student_no="26348" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26151</td><td class="span4">YEN JIAN HENG</td><td class="span2" style="text-align:center">袁健恒</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9385" data-student_name="YEN JIAN HENG" data-student_cname="袁健恒" data-class_name="J1B" data-student_no="26151" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26428</td><td class="span4">CLARYSE THIANG SHYN YIE </td><td class="span2" style="text-align:center">程鈊渝</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9390" data-student_name="CLARYSE THIANG SHYN YIE " data-student_cname="程鈊渝" data-class_name="J1B" data-student_no="26428" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26156</td><td class="span4">TOH QIAO YU</td><td class="span2" style="text-align:center">卓巧妤</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9414" data-student_name="TOH QIAO YU" data-student_cname="卓巧妤" data-class_name="J1B" data-student_no="26156" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26166</td><td class="span4">LEW KAI XUN</td><td class="span2" style="text-align:center">廖棨勋</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9418" data-student_name="LEW KAI XUN" data-student_cname="廖棨勋" data-class_name="J1B" data-student_no="26166" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26276</td><td class="span4">LAW YU ZHE</td><td class="span2" style="text-align:center">陆祤喆</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9463" data-student_name="LAW YU ZHE" data-student_cname="陆祤喆" data-class_name="J1B" data-student_no="26276" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26171</td><td class="span4">LIM EE TANG</td><td class="span2" style="text-align:center">林溢棠</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9481" data-student_name="LIM EE TANG" data-student_cname="林溢棠" data-class_name="J1B" data-student_no="26171" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26237</td><td class="span4">TAN BEE SIAN</td><td class="span2" style="text-align:center">陈美善</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9495" data-student_name="TAN BEE SIAN" data-student_cname="陈美善" data-class_name="J1B" data-student_no="26237" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26451</td><td class="span4">LEE SHEN YUEN </td><td class="span2" style="text-align:center">李圣源</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9538" data-student_name="LEE SHEN YUEN " data-student_cname="李圣源" data-class_name="J1B" data-student_no="26451" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26471</td><td class="span4">WONG WAI QING</td><td class="span2" style="text-align:center">黄葦晴</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9569" data-student_name="WONG WAI QING" data-student_cname="黄葦晴" data-class_name="J1B" data-student_no="26471" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26498</td><td class="span4">CHIN YOU WEI</td><td class="span2" style="text-align:center">陈宥纬</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9593" data-student_name="CHIN YOU WEI" data-student_cname="陈宥纬" data-class_name="J1B" data-student_no="26498" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="odd">
<td class="span2" style="text-align:center">26502</td><td class="span4">LIM SENG THIM</td><td class="span2" style="text-align:center">林圣添</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9596" data-student_name="LIM SENG THIM" data-student_cname="林圣添" data-class_name="J1B" data-student_no="26502" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
<tr class="even">
<td class="span2" style="text-align:center">26509</td><td class="span4">LAI XIU JEAN</td><td class="span2" style="text-align:center">黎秀晶</td><td class="span2" style="text-align:center">J1B</td><td><div class="btn-group" /><a onclick="addToEkstra(this);return false;" data-student_id="9602" data-student_name="LAI XIU JEAN" data-student_cname="黎秀晶" data-class_name="J1B" data-student_no="26509" data-class_id="693" data-mark_item="0.00" class="btn" href="#"><icon class="icon-ok"></icon></a></div></td></tr>
</tbody>
</table>
<div class="keys" style="display:none" title="/sms/index.php?StudentPerformanceM%5Bclass_id%5D=693&amp;StudentPerformanceM%5Bitem_id%5D=2449&amp;ajax=student-grid&amp;date=2026-06-06&amp;item_id=2449&amp;r=transaction%2FstudentPerformance%2Fupdate"><span>8959</span><span>8963</span><span>8969</span><span>8973</span><span>8978</span><span>8983</span><span>8985</span><span>8986</span><span>8996</span><span>9011</span><span>9018</span><span>9021</span><span>9026</span><span>9027</span><span>9028</span><span>9046</span><span>9061</span><span>9080</span><span>9084</span><span>9114</span><span>9129</span><span>9130</span><span>9144</span><span>9145</span><span>9151</span><span>9161</span><span>9164</span><span>9169</span><span>9196</span><span>9208</span><span>9227</span><span>9232</span><span>9243</span><span>9261</span><span>9266</span><span>9301</span><span>9302</span><span>9309</span><span>9320</span><span>9322</span><span>9352</span><span>9355</span><span>9362</span><span>9382</span><span>9385</span><span>9390</span><span>9414</span><span>9418</span><span>9463</span><span>9481</span><span>9495</span><span>9538</span><span>9569</span><span>9593</span><span>9596</span><span>9602</span></div>
</div>    </div>

    <div class="modal-footer">
            </div>

    </div></div>
<script>

    var changeGridStudentList = function() {
        filterS = $("#filter").val();
        class_id = $("#class_id").val();
        club_id  = $("#club_id").val();
        item_id  =  $("#StudentPerformanceM_item_id").val();
        stringData = 'StudentPerformanceM[class_id]='+class_id+'&StudentPerformanceM[item_id]='+item_id;
        if (filterS == 'club') {
            stringData = 'StudentPerformanceM[club_id]='+club_id+'&StudentPerformanceM[item_id]='+item_id;
        }
        $('#student-grid').yiiGridView('update', {
            data: stringData,
            success: function(result) {
                var $data = $('<div>' + result + '</div>');
                var updateId = '#student-grid';
                $(updateId).replaceWith($(updateId, $data));
            }
        });
    }

    $('input[type=radio]').change(function(){
        if ($(this).val() == 'class' ) {
            $("#listClub").hide();
            $("#club_id").val('');
            $("#filter").val('class');
            $("#listClass").show();
        }else{
            $("#listClass").hide();
            $("#class_id").val('');
            $("#filter").val('club');
            $("#listClub").show();
        }

        changeGridStudentList();
    });
</script>


<div class="form-actions">
  <button class="btn btn-primary" id="yw5" type="submit" name="yt1">保存</button>  <button class="btn" id="yw6" type="reset" name="yt2">重置</button></div>

</form><script>
var changeGridStudent = function () {
  var date = $('#StudentPerformanceM_date').val();
  var item_id = $('#StudentPerformanceM_item_id').val();
  var dataString = "StudentPerformanceM[date]=" + date + "&StudentPerformanceM[item_id]=" + item_id;
  $('#student-performance-m-grid').yiiGridView('update', {
    data: dataString,
    success: function (data) {
      var $data = $('<div>' + data + '</div>');
      var updateId = '#student-performance-m-grid';
      $(updateId).replaceWith($(updateId, $data));
    },complete:function(){
      var tr_length = $('#student-performance-m-grid table tbody tr').length;

      if(tr_length >0){
      if($("#student-performance-m-grid  table tbody tr td").hasClass("empty")){
          $(".summary").html("");
        }else{
          $(".summary").html("第 1-"+ tr_length+ " 条, 共 "+ tr_length + " 条.");
        }
      }else{
        $(".summary").html("");
      }
    }
  });

}

var showModal = function () {
  var ekstraId = $('#StudentPerformanceM_item_id').val();
  if (ekstraId) {
    changeGridStudentList();
    $("#studentModal").modal("show");
  } else {
    alert('请选择项目！')
  }
}

var addToEkstra = function (obj) {
  $('#student-performance-m-grid  table tbody tr td.empty').parents('tr').remove();
  var student_no = $(obj).data('student_no');
  var studentName = $(obj).data('student_name');
  var studentCName = $(obj).data('student_cname');
  var studentId = $(obj).data('student_id');
  var className = $(obj).data('class_name');
  var class_id = $(obj).data('class_id');
  var mark_item = $(obj).data('mark_item');

  var newVal = '<tr class="' + studentId + '">\n\<td style="text-align:center">' + student_no + '</td>\n\<td><input class="span2" type="hidden" name="StudentPerformanceM[inputperformance][' + studentId + '][class_id]" value="' + class_id + '">' + studentName + '\n\</td>\n\
  \n<td style="text-align:center">' + studentCName + '</td>\n<td style="text-align:center">' + className + '</td>\
  \n\
  <td>\n\<select  class="span12" required name="StudentPerformanceM[inputperformance][' + studentId + '][type_of_bonus]" data-student_id="' + studentId + '"><option value=></option><option value="1">校外学艺</option><option value="2">特殊表现</option></select>\n\</td><td><textarea id="StudentPerformanceM_inputperformance_' + studentId + '_remark" name="StudentPerformanceM[inputperformance][' + studentId + '][remark]"  type="text" value=""></textarea></td>\n\n<td><input class="span12" id="StudentPerformanceM_inputperformance_' + studentId + '_mark" name="StudentPerformanceM[inputperformance][' + studentId + '][mark]"  type="text" value=' + mark_item + '></input></td><td><a onclick="delItem(this);return false;" class="buttonEdit btn" href="#"><icon class="icon-minus-sign"></icon></a></td>\n\</tr>';
  var inputStudentId = $('#student-performance-m-grid table tbody').find('tr.' + studentId);
  if (inputStudentId.length == 0) {
    $('#student-performance-m-grid table tbody').append(newVal);
  } else {
    alert('This data is already inserted!');
  }
  var tr_length = $('#student-performance-m-grid table tbody tr').length;

  if(tr_length >0){
    $(".summary").html("第 1-"+ tr_length+ " 条, 共 "+ tr_length + " 条.");
  }else{
    $(".summary").html("");
  }

}

var delItem = function (val) {
  $(val).parents('tr').remove();
  var tr_empty = '<tr><td colspan="12" class="empty"><span class="empty">没有找到数据.</span></td></tr>';
  var tr_length = $('#student-performance-m-grid table tbody tr').length;
  if (tr_length == 0) {
    $('#student-performance-m-grid table tbody').append(tr_empty);
    $(".summary").html(" ");
  }else{  alert(tr_length);
    $(".summary").html("第 1-"+ tr_length+ " 条, 共 "+ tr_length+ " 条.");
  }
  ;
  //    console.log(val);
}


var delValue = function (id, student_id) {

  if (confirm('你确定要删除这个项目吗？')) {
    $.ajax({
      type: "POST",
      url: "/sms/index.php?r=transaction/studentPerformance/delete&id="+id+"",
      success: function () {
        alert('Data 成功删除。');
        changeGridStudent();
      }
    })
  }
  ;

}
$('#StudentPerformanceM_item_id').select2()
.on("change", function (e) {
  changeGridStudent();
})
</script>
</div></div>



  </div>

  <!-- // Content END -->



</div>



</div>





<!-- Modal Period -->

<div id="myModal" class="modal hide fade">

  <div class="modal-header">

    <a class="close" data-dismiss="modal">&times;</a>

    <h4>Header</h4>

  </div>

  <div class="modal-body" id="body-modal"></div>

  <div class="modal-footer">

    <button onclick="submitForm(this);return false;" class="btn btn-primary" id="yw31" name="yt0" type="button">Save</button><button data-dismiss="modal" class="btn" id="yw32" name="yt1" type="button">Close</button>

  </div>

</div>





<!-- // Main Container Fluid END -->

<script type="text/javascript" src="/sms/assets/5815e87/gridview/jquery.yiigridview.js"></script>
<script type="text/javascript">
/*<![CDATA[*/
jQuery(function($) {
jQuery('#StudentPerformanceM_item_id').select2({'placeholder':'项目','allowClear':true,'width':'resolve'}).select2('enable', false);
jQuery('#student-performance-m-grid').yiiGridView({'ajaxUpdate':['student-performance-m-grid'],'ajaxVar':'ajax','pagerClass':'pagination','loadingClass':'grid-view-loading','filterClass':'filters','tableClass':'table table-striped table-bordered table-condensed table','selectableRows':1,'enableHistory':false,'updateSelector':'{page}, {sort}','filterSelector':'{filter}','afterAjaxUpdate':function() {
			jQuery('.popover').remove();
			jQuery('[data-toggle=popover]').popover();
			jQuery('.tooltip').remove();
			jQuery('[data-toggle=tooltip]').tooltip();
		}});
jQuery('#student-grid').yiiGridView({'ajaxUpdate':['student-grid'],'ajaxVar':'ajax','pagerClass':'pagination','loadingClass':'grid-view-loading','filterClass':'filters','tableClass':'table table-striped table-bordered table-condensed table','selectableRows':1,'enableHistory':false,'updateSelector':'{page}, {sort}','filterSelector':'{filter}','pageVar':'id_page','afterAjaxUpdate':function() {
			jQuery('.popover').remove();
			jQuery('[data-toggle=popover]').popover();
			jQuery('.tooltip').remove();
			jQuery('[data-toggle=tooltip]').tooltip();
		}});
jQuery('#studentModal').modal({'show':false});

					if(!window.location.hash)
						jQuery('#StudentPerformanceM_student_performance_id').focus();
				
jQuery('#myModal').modal({'show':false});
jQuery('#yw9_0 .alert').alert();

             $(".currencyField").maskMoney({"symbolStay":true,"thousands":",","decimal":".","symbol":null})
});
/*]]>*/
</script>
</body>


</html>



<!-- Modernizr -->

<script src="/sms/themes/ergo/common/theme/scripts/plugins/system/modernizr.js"></script>



<!-- SlimScroll Plugin -->

<script src="/sms/themes/ergo/common/theme/scripts/plugins/other/jquery-slimScroll/jquery.slimscroll.min.js"></script>



<!-- Common Demo Script -->

<script src="/sms/themes/ergo/common/theme/scripts/demo/common.js?1369753444"></script>



<!-- Holder Plugin -->

<script src="/sms/themes/ergo/common/theme/scripts/plugins/other/holder/holder.js"></script>



<!-- Uniform Forms Plugin -->

<script src="/sms/themes/ergo/common/theme/scripts/plugins/forms/pixelmatrix-uniform/jquery.uniform.min.js"></script>



<!-- DataTables Tables Plugin -->

<script src="/sms/themes/ergo/common/theme/scripts/plugins/tables/DataTables/media/js/jquery.dataTables.min.js"></script>

<script src="/sms/themes/ergo/common/theme/scripts/plugins/tables/DataTables/media/js/DT_bootstrap.js"></script>



<script>



// $(function(){

//     /* DataTables */

//     $('#DataTables').dataTable({

//         "bPaginate" : false,

//         'Search' : false,

//         "sPaginationType": "bootstrap",

//         "sDom": "<'row-fluid'<'span6'l><'span6'f>r>t<'row-fluid'<'span6'i><'span6'p>>",

//         "oLanguage": {

//             "sLengthMenu": "_MENU_ records per page"

//         }

//     });

// });



$(window).load(function () {

  currentURL = $(location).attr('href');

  currentHost = $(location).attr('host');

  currentPath = currentURL.replace('http://' + currentHost, '');

  paths = currentPath.split('/');

  path = paths[paths.length - 1];

  pat = new RegExp('(\\b' + path + '\\b)(?!.*\\b\\1\\b)', 'i');

  currentPath = currentPath.replace(pat, '');

  // console.log(currentPath);

  $('ul.menu-0').children('li').each(function () {

    // level 1

    level1 = $(this).children('a');

    level1URL = level1.attr('href');

    if (level1URL) {

      paths = level1URL.split('/');

      path = paths[paths.length - 1];

      pat = new RegExp('(\\b' + path + '\\b)(?!.*\\b\\1\\b)', 'i');

      level1URL = level1URL.replace(pat, '');

    }



    if (level1URL == currentPath) {

      $(this).closest('li').addClass('active');

    }



    // level 2

    level2 = $(this).children('ul');

    level2.children('li').each(function () {

      level2URL = $(this).children('a').attr('href');

      if (level2URL) {

        paths = level2URL.split('/');

        path = paths[paths.length - 1];

        pat = new RegExp('(\\b' + path + '\\b)(?!.*\\b\\1\\b)', 'i');

        level2URL = level2URL.replace(pat, '');

      }

      if (level2URL == currentPath) {

        $(this).closest('li').parents('ul').parents('li').children('span').removeAttr('class');

        $(this).closest('li').parents('ul').parents('li').children('span').addClass('karetP-up');

        $(this).closest('li').addClass('active');

        $(this).closest('li').parents('ul').addClass('in');

        $(this).closest('li').parents('ul').parents('li').addClass('active');

      }

    })



    // level 3

    level_1 = $(this).children('ul');

    level_2 = level_1.children('li');

    level3 = level_2.children('ul');

    level3.children('li').each(function () {

      level3URL = $(this).children('a').attr('href');

      if (level3URL) {

        paths = level3URL.split('/');

        path = paths[paths.length - 1];

        pat = new RegExp('(\\b' + path + '\\b)(?!.*\\b\\1\\b)', 'i');

        level3URL = level3URL.replace(pat, '');

      }

      if (level3URL == currentPath) {

        console.log(level3URL + " = " + currentPath);

        $(this).closest('li').parents('ul').parents('li').children('span').removeAttr('class');

        $(this).closest('li').parents('ul').parents('li').children('span').addClass('karet-up');

        $(this).closest('li').parents('ul').parents('li').parents('ul').parents('li').children('span').removeAttr('class');

        $(this).closest('li').parents('ul').parents('li').parents('ul').parents('li').children('span').addClass('karetP-up');



        $(this).closest('li').addClass('active');

        $(this).closest('li').parents('ul').addClass('in');

        $(this).closest('li').parents('ul').parents('li').addClass('active');

        $(this).closest('li').parents('ul').parents('li').parents('ul').addClass('in');

        $(this).closest('li').parents('ul').parents('li').parents('ul').parents('li').addClass('active');

      }

    })



    // level 4

    level_1 = $(this).children('ul');

    level_2 = level_1.children('li');

    level_3 = level_2.children('ul');

    level_4 = level_3.children('li');

    level4 = level_4.children('ul');

    level4.children('li').each(function () {

      level4URL = $(this).children('a').attr('href');

      if (level3URL) {

        paths = level4URL.split('/');

        path = paths[paths.length - 1];

        pat = new RegExp('(\\b' + path + '\\b)(?!.*\\b\\1\\b)', 'i');

        level4URL = level4URL.replace(pat, '');

      }

      if (level4URL == currentPath) {

        console.log(level4URL + " = " + currentPath);

        $(this).closest('li').parents('ul').parents('li').children('span').removeAttr('class');

        $(this).closest('li').parents('ul').parents('li').children('span').addClass('karet-up');

        $(this).closest('li').parents('ul').parents('li').parents('ul').parents('li').children('span').removeAttr('class');

        $(this).closest('li').parents('ul').parents('li').parents('ul').parents('li').children('span').addClass('karet-up');

        $(this).closest('li').parents('ul').parents('li').parents('ul').parents('li').parents('ul').parents('li').children('span').removeAttr('class');

        $(this).closest('li').parents('ul').parents('li').parents('ul').parents('li').parents('ul').parents('li').children('span').addClass('karetP-up');



        $(this).closest('li').addClass('active');

        $(this).closest('li').parents('ul').addClass('in');

        $(this).closest('li').parents('ul').parents('li').addClass('active');

        $(this).closest('li').parents('ul').parents('li').parents('ul').addClass('in');

        $(this).closest('li').parents('ul').parents('li').parents('ul').parents('li').addClass('active');

        $(this).closest('li').parents('ul').parents('li').parents('ul').parents('li').parents('ul').addClass('in');

        $(this).closest('li').parents('ul').parents('li').parents('ul').parents('li').parents('ul').parents('li').addClass('active');

      }

    })



  })

});



(function (a) {
  (jQuery.browser = jQuery.browser || {}).mobile = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))
})(navigator.userAgent || navigator.vendor || window.opera);

if (jQuery.browser.mobile)

{

  jQuery(document).ready(function (cash) {

    $("#menu").addClass('hidden-phone');

    $("li.dropdown a").click(function (e) {

      $(this).next('ul.dropdown-menu').css("display", "block");

      e.stopPropagation();

    });

  });

} else

{

  console.log('You are not using a mobile device!');

  $("li.menu1").click(function () {

    karet1 = $(this).children('span').attr('class');

    console.log(karet1);

    if (karet1 == 'karetP-up') {

      $(this).children('span').removeAttr('class');

      $(this).children('span').addClass('karetP');

    } else {

      $(this).children('span').removeAttr('class');

      $(this).children('span').addClass('karetP-up');

    }

  });



  $("li.menu2").click(function () {

    karet2 = $(this).children('span').attr('class');

    if (karet2 == 'karet-up') {

      $(this).parents('ul').parents('li').children('span').removeAttr('class');

      $(this).children('span').removeAttr('class');

      $(this).children('span').addClass('karet');

    } else {

      $(this).parents('ul').parents('li').children('span').removeAttr('class');

      $(this).children('span').removeAttr('class');

      $(this).children('span').addClass('karet-up');

    }

  });



  $("li.menu3").click(function () {

    karet3 = $(this).children('span').attr('class');

    if (karet3 == 'karet-up') {

      $(this).parents('ul').parents('li').children('span').removeAttr('class');

      $(this).parents('ul').parents('li').parents('ul').parents('li').children('span').removeAttr('class');

      $(this).children('span').removeAttr('class');

      $(this).children('span').addClass('karet');

    } else {

      $(this).parents('ul').parents('li').children('span').removeAttr('class');

      $(this).parents('ul').parents('li').parents('ul').parents('li').children('span').removeAttr('class');

      $(this).children('span').removeAttr('class');

      $(this).children('span').addClass('karet-up');

    }

  });

}



// New Modal Period

function loadPeriod(obj) {

  var url = $(obj).data('url');

  var title = $(obj).data("title");

  // alert(url);

  $("#myModal .modal-header h4").html(title);

  // console.log(url);

  var idSelect = $(obj).parents(".input-append").find("select").attr("id");

  $("#myModal").data("select", idSelect);

  $.ajax({

    url: url,

    dataType: 'json',

    success: function (result) {

      if (result.contents) {

        $("#body-modal").html(result.contents);

      }

    }

  });

}
;



function submitForm(obj) {

  var form = $(obj).parents("#myModal").find("form");

  $.ajax({

    url: form.attr('action'),

    type: 'post',

    dataType: 'json',

    data: form.serialize(),

    beforeSend: function () {

      $(obj).button().attr("disabled", true);

    },

    success: function (result) {

      if (result.success) {

        $("#myModal").modal('hide');

        if (result.hasOwnProperty('reload') && result.reload === true) {

          location.reload();

        } else {

          reloadParent();

        }

      } else {

        $("#body-modal").html(result.contents);

      }



    }

  }).always(function () {

    $(obj).button().attr("disabled", false);

  });

}
;



function reloadParent() {

  var idSelect = "#" + $("#myModal").data('select');

  $.ajax({

    url: window.location.href,

    success: function (result) {

      data = $(result).find(idSelect);

      value = $("form " + idSelect).val()

      if ($("form " + idSelect).replaceWith(data)) {

        $("form " + idSelect).val(value);

      }

    }

  });

}
;



// jQuery('#myModal').modal({'show':false});

</script>
