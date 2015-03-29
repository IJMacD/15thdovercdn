STATUS_OK = "";
STATUS_ERROR = "ERROR";
STATUS_WAIT = "Communicating...";

var info_count = 0;
var statusid;
var connected = true;

var lifetime = 60000;

function init(){
    //for(i=0;i<$('infos').childNodes.length;i++){
    //    id = $('infos').childNodes[i].id;
    //    if(!$('infos').childNodes[i].important) setTimeout("fade('"+id+"')", 10000);
    //
    setInterval("keepAlive()", lifetime);
	//This is done before adding more infos so not needed here
	//setTimeout("removeInfos()", lifetime);
}

/**
 * Depreciated
 */
function showBox(id){
    var box = $o(id);
    if(box != null){
        if(box.style.display == "none") box.style.display = "block";
        else box.style.display = "none";
    }
}

/**
 * Not sure whether or not this is currently used
 */
function activateTab(tab, box){
    if(!$o(tab) || !$o(box)) return;
    
    showBox(box);
    
    if($o(tab).className == "selected") $o(tab).className = "";
    else $o(tab).className = "selected";
}

/**
 * Used for displaying keepAlive message
 */
function countdown(remsecs){
	if (remsecs < 0) {
		//document.getElementById('timer').innerHTML = "You have been logged out";
		Communicate('ping','');
		countdown(60);
		return;
	}
	mins = (Math.floor(remsecs/60)).toString();
	if(mins.length < 2)
		mins = "0" + mins;
	secs = (remsecs%60).toString();
	if(secs.length < 2)
		secs = "0" + secs;
	control = document.getElementById("timer");
	if(control != null)
		control.innerHTML = "You will be kept alive in " + mins + ":" + secs;
	setTimeout("countdown(" + (remsecs-1) + ")", 1000);
}

function keepAlive()
{
	$.get('/process/web', { ping: 1 }, function(response)
	{
		//result	= response.split('\n', 2)[0];
		//data	= $.parseJSON(response.split('\n', 2)[1]);
		data	= $.parseJSON(response);
		
		/*
		if(/[0-9]{3}/.test(result.substr(0,3)))
		{ 
			responseCode	= result.substring(0, 3);
			responseMessage	= result.substring(4);
			
			switch(responseCode)
			{
				case "200": //OK
					break;
				case "401": //Not Logged in
					break;
				case "400": //Bad Request 
				case "404": //Not found
				case "405": //Method Not Allowed                          
					addInfo("Problem", "Problem with client"); 
					break;
				case "403": //Forbidden
					addInfo("Problem", "You are not allowed to do that.");
					break;   
				case "500": //Internal Error
					addInfo("Problem", responseMessage);
					break;
				default:                                                      
					addInfo("Problem", "Error, Unexpected reply");
			}				
		}
		*/
		
		if(data)
		{
			if(user && data.user && user.username != data.user.username)
			{
				window.location.href = "http://15thdoverscouts.org.uk/";
				return;
			}
			
			if(data.infos)
			{
				for(i = 0; i < data.infos.length; i++)
				{
					addInfo(data.infos[i].level, data.infos[i].message, data.infos[i].important);
				}
			}
			if(data.pagestats)
			{
				$('#pagestats').text(data.pagestats);
			}
		}
	});
}

function addInfo(level, message, persist){
    id = "jinfo" + info_count;
	class_name = persist ? 'box important' : 'box';
    $('div#infos').append('<div class="' + class_name + '" id="' + id + '"><a href="javascript:removeInfo(\'' + id + '\');" style="float: right;">Dismiss</a><span class="hd">' + level + '</span> ' + message + '</div>');        
    if(user.level == 9)
		$('#latestupdates ul').prepend('<li><a href="#">'+level+'</a> '+message);
	if(!persist)
		setTimeout("removeInfo('"+id+"')", lifetime);
    info_count++;
    return id;
}

function removeInfos(){
    $('div#infos div.box').not('.important').slideUp();
}
function removeInfo(id){
    $('#'+id).slideUp();
}

function setConnected(conn){
    if(conn != connected)
    {
        if(conn){
            addInfo("Congratulations", "You have been reconnected with the server");
            setStatus(STATUS_OK);
        }else{
            addInfo("Problem", "It seems you have been disconnected from the server");
            setStatus("<span style=\"text-decoration: blink; color: #FF3300;\">Disconnected</span>");
        }
        connected = conn;
    }
}

    
function setStatus(message){
    //if($o('status_bar') != null) $o('status_bar').innerHTML = message;
}

function Communicate(query, callback, errorcallback){
    var ajax;  // The variable that makes Ajax possible! 
    
    try{
            // Opera 8.0+, Firefox, Safari
            ajax = new XMLHttpRequest();
    } catch (e){
            // Internet Explorer Browsers
            try{
                    ajax = new ActiveXObject("Msxml2.XMLHTTP");
            } catch (e) {
                    try{
                            ajax = new ActiveXObject("Microsoft.XMLHTTP");
                    } catch (e){
                            return false;
                    }
            }
    }
    if(query.substr(0, 7) == "http://"){ url = query;  method = "GET"; query = ""; }
    else if(query.substr(0, 5) == "ADMIN") { 
        url = "/admin/adminprocess.php";
        method = "POST";
        query = query.substr(5);
    } else { url = "/webprocess.php"; method = "POST"; }
    ajax.open(method, url, true);

    ajax.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    //ajax.setRequestHeader("Content-length", parms.length);
    //ajax.setRequestHeader("Connection", "close");

    ajax.onreadystatechange = function() {//Call a function when the state changes.
            if(ajax.readyState == 4){                      
                //fade(statusid);
                switch(ajax.status){
                    case 200:
                        var rawreply = ajax.responseText;
                        if(/[0-9]{3}/.test(rawreply.substr(0,3))){ 
                            var responseCode = rawreply.substring(0, 3);
                            var response = rawreply.substring(4);
                        }else{ callback(rawreply); setStatus(STATUS_OK); return; }
                        switch(responseCode){
                            case "200": //OK         
                                callback(response);
                                break;
                            case "401": //Not Logged in 
                                if(errorcallback) errorcallback(response);                   
                                if(logged_in) window.location.href = "http://15thdoverscouts.org.uk/";
                                break;
                            case "400": //Bad Request 
                            case "404": //Not found
                            case "405": //Method Not Allowed                          
                                addInfo("Problem", "Problem with client");
                                if(errorcallback) errorcallback(response);   
                                break;
                            case "403": //Forbidden
                                addInfo("Problem", "You are not allowed to do that.");
                                if(errorcallback) errorcallback(response);
                                break;   
                            case "500": //Internal Error
                                addInfo("Problem", response[1]);
                                if(errorcallback) errorcallback(response);   
                                break;
                            default:                                                      
                                addInfo("Problem", "Error, Unexpected reply");
                                if(errorcallback) errorcallback(response);   
                        }
                        setStatus(STATUS_OK);
                        setConnected(true);
                        break;             
                    case 404:                                                                                           
                        addInfo("Error", "Something has gone wrong between with server and your computer");
                        if(errorcallback) errorcallback();   
                        break;
                    case 500:
                        addInfo("Problem", "Sorry but there is currently a problem with the server");
                        if(errorcallback) errorcallback();
                        break;
                    default:
                        if(errorcallback) errorcallback();   
                        setConnected(false);
                }                     
            }
    }
    setStatus(STATUS_WAIT);
    ajax.send(query);
}

function $o(element) {
  if (document.getElementById)
    return document.getElementById(element);
  else if (document.all)
    return document.all[element];
  else
    return null;
}

/**
 * All superceeded by jQuery
 */
var TimeToFade = 1000.0;

function fade(eid)
{
  var element = document.getElementById(eid);
  if(element == null)
    return;
   
  if(element.FadeState == null)
  {
    if(element.style.opacity == null
        || element.style.opacity == ''
        || element.style.opacity == '1')
    {
      element.FadeState = 2;
    }
    else
    {
      element.FadeState = -2;
    }
  }
   
  if(element.FadeState == 1 || element.FadeState == -1)
  {
    element.FadeState = element.FadeState == 1 ? -1 : 1;
    element.FadeTimeLeft = TimeToFade - element.FadeTimeLeft;
  }
  else
  {
    element.FadeState = element.FadeState == 2 ? -1 : 1;
    element.FadeTimeLeft = TimeToFade;
    setTimeout("animateFade(" + new Date().getTime() + ",'" + eid + "')", 33);
  } 
}

function animateFade(lastTick, eid, remove)
{ 
  var curTick = new Date().getTime();
  var elapsedTicks = curTick - lastTick;
 
  var element = document.getElementById(eid);
 
  if(element.FadeTimeLeft <= elapsedTicks)
  {
    element.style.opacity = element.FadeState == 1 ? '1' : '0';
    element.style.filter = 'alpha(opacity = '
        + (element.FadeState == 1 ? '100' : '0') + ')';
    element.FadeState = element.FadeState == 1 ? 2 : -2;
    if(element.FadeState == -2) $o('infos').removeChild($o(eid));
    return;
  }
 
  element.FadeTimeLeft -= elapsedTicks;
  var newOpVal = element.FadeTimeLeft/TimeToFade;
  if(element.FadeState == 1)
    newOpVal = 1 - newOpVal;

  element.style.opacity = newOpVal;
  element.style.filter =
      'alpha(opacity = ' + (newOpVal*100) + ')';
 
  setTimeout("animateFade(" + curTick + ",'" + eid + "')", 33);
}
/**************************************************************************************
  htmlDatePicker v0.1
  
  Copyright (c) 2005, Jason Powell
  All Rights Reserved

  Redistribution and use in source and binary forms, with or without modification, are 
    permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright notice, this list of 
      conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright notice, this list 
      of conditions and the following disclaimer in the documentation and/or other materials 
      provided with the distribution.
    * Neither the name of the product nor the names of its contributors may be used to 
      endorse or promote products derived from this software without specific prior 
      written permission.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS 
  OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF 
  MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL 
  THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, 
  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE 
  GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED 
  AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING 
  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED 
  OF THE POSSIBILITY OF SUCH DAMAGE.
  
  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-==-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

  
***************************************************************************************/
// User Changeable Vars
var HighlightToday  = true;    // use true or false to have the current day highlighted
var DisablePast    = false;    // use true or false to allow past dates to be selectable
// The month names in your native language can be substituted below
var MonthNames = new Array("January","February","March","April","May","June","July","August","September","October","November","December");

// Global Vars
var now = new Date();
var dest = null;
var ny = now.getFullYear(); // Today's Date
var nm = now.getMonth();
var nd = now.getDate();
var sy = 0; // currently Selected date
var sm = 0;
var sd = 0;
var y = now.getFullYear(); // Working Date
var m = now.getMonth();
var d = now.getDate();
var l = 0;
var t = 0;
var MonthLengths = new Array(31,28,31,30,31,30,31,31,30,31,30,31);

/*
  Function: GetDate(control)

  Arguments:
    control = ID of destination control
*/
function GetDate() {
  EnsureCalendarExists();
  DestroyCalendar();
  // One arguments is required, the rest are optional
  // First arguments must be the ID of the destination control
  if(arguments[0] == null || arguments[0] == "") {
    // arguments not defined, so display error and quit
    alert("ERROR: Destination control required in funciton call GetDate()");
    return;
  } else {
    // copy argument
    dest = arguments[0];
  }
  y = now.getFullYear();
  m = now.getMonth();
  d = now.getDate();
  sm = 0;
  sd = 0;
  sy = 0;
  var cdval = dest.value;
  if(/\d{1,2}.\d{1,2}.\d{4}/.test(dest.value)) {
    // element contains a date, so set the shown date
    var vParts = cdval.split("/"); // assume dd/mm/yyyy
    sd = vParts[0];
    sm = vParts[1] - 1;
    sy = vParts[2];
    m=sm;
    d=sd;
    y=sy;
  }
  
//  l = dest.offsetLeft; // + dest.offsetWidth;
//  t = dest.offsetTop - 125;   // Calendar is displayed 125 pixels above the destination element
//  if(t<0) { t=0; }      // or (somewhat) over top of it. ;)

  /* Calendar is displayed 125 pixels above the destination element
  or (somewhat) over top of it. ;)*/
  l = dest.offsetLeft + dest.offsetParent.offsetLeft;
  t = dest.offsetTop - 125;
  if(t < 0) t = 0; // >
  DrawCalendar();
}

/*
  function DestoryCalendar()
  
  Purpose: Destory any already drawn calendar so a new one can be drawn
*/
function DestroyCalendar() {
  var cal = document.getElementById("dpCalendar");
  if(cal != null) {
    cal.innerHTML = null;
    cal.style.display = "none";
  }
  return
}

function DrawCalendar() {
  DestroyCalendar();
  cal = document.getElementById("dpCalendar");
  cal.style.left = l + "px";
  cal.style.top = t + "px";
  
  var sCal = "<table><tr><td class=\"cellButton\"><a href=\"javascript: PrevMonth();\" title=\"Previous Month\">&lt;&lt;</a></td>"+
    "<td class=\"cellMonth\" width=\"80%\" colspan=\"5\">"+MonthNames[m]+" "+y+"</td>"+
    "<td class=\"cellButton\"><a href=\"javascript: NextMonth();\" title=\"Next Month\">&gt;&gt;</a></td></tr>"+
    "<tr><td>S</td><td>M</td><td>T</td><td>W</td><td>T</td><td>F</td><td>S</td></tr>";
  var wDay = 1;
  var wDate = new Date(y,m,wDay);
  if(isLeapYear(wDate)) {
    MonthLengths[1] = 29;
  } else {
    MonthLengths[1] = 28;
  }
  var dayclass = "";
  var isToday = false;
  for(var r=1; r<7; r++) {
    sCal = sCal + "<tr>";
    for(var c=0; c<7; c++) {
      var wDate = new Date(y,m,wDay);
      if(wDate.getDay() == c && wDay<=MonthLengths[m]) {
        if(wDate.getDate()==sd && wDate.getMonth()==sm && wDate.getFullYear()==sy) {
          dayclass = "cellSelected";
          isToday = true;  // only matters if the selected day IS today, otherwise ignored.
        } else if(wDate.getDate()==nd && wDate.getMonth()==nm && wDate.getFullYear()==ny && HighlightToday) {
          dayclass = "cellToday";
          isToday = true;
        } else {
          dayclass = "cellDay";
          isToday = false;
        }
        if(((now > wDate) && !DisablePast) || (now <= wDate) || isToday) { // >
          // user wants past dates selectable
          sCal = sCal + "<td class=\""+dayclass+"\"><a href=\"javascript: ReturnDay("+wDay+");\">"+wDay+"</a></td>";
        } else {
          // user wants past dates to be read only
          sCal = sCal + "<td class=\""+dayclass+"\">"+wDay+"</td>";
        }
        wDay++;
      } else {
        sCal = sCal + "<td class=\"unused\"></td>";
      }
    }
    sCal = sCal + "</tr>";
  }
  sCal = sCal + "<tr><td colspan=\"4\" class=\"unused\"></td><td colspan=\"3\" class=\"cellCancel\"><a href=\"javascript: DestroyCalendar();\">Cancel</a></td></tr></table>"
  cal.innerHTML = sCal; // works in FireFox, opera
  cal.style.display = "inline";
}

function PrevMonth() {
  m--;
  if(m==-1) {
    m = 11;
    y--;
  }
  DrawCalendar();
}

function NextMonth() {
  m++;
  if(m==12) {
    m = 0;
    y++;
  }
  DrawCalendar();
}

function ReturnDay(day) {
  cDest = document.getElementById(dest);
  dest.value = day+"/"+(m+1)+"/"+y;
  DestroyCalendar();
}

function EnsureCalendarExists() {
  if(document.getElementById("dpCalendar") == null) {
    var eCalendar = document.createElement("div");
    eCalendar.setAttribute("id", "dpCalendar");
    document.body.appendChild(eCalendar);
  }
}

function isLeapYear(dTest) {
  var y = dTest.getYear();
  var bReturn = false;
  
  if(y % 4 == 0) {
    if(y % 100 != 0) {
      bReturn = true;
    } else {
      if (y % 400 == 0) {
        bReturn = true;
      }
    }
  }
  
  return bReturn;
}  