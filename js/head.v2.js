STATUS_OK = "";
STATUS_ERROR = "ERROR";
STATUS_WAIT = "Communicating...";

var info_count = 0;

var lifetime = 60000;

function init(){
    setInterval("keepAlive()", lifetime);
}

function keepAlive()
{
    $.get('/process/web', { ping: 1 }, function(response)
    {
        var data = $.parseJSON(response);

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
    var id = "jinfo" + info_count;
    var class_name = persist ? 'box important' : 'box';
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