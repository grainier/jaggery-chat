var chat = chat || {};
chat.SERVER = "ws://192.168.1.103:9763/chat/server.jag";
chat.USER = null;
chat.CHAT_ID = null;
chat.socket = null;
chat.SOCKET_WAIT = 1000;
chat.actions = {
    "INITIATE_CHAT": "initiate_chat",
    "DISCONNECT_CHAT": "disconnect_chat",
    "START_CHAT": "start_chat",
    "UPDATE_USERS": "update_users",
    "APPEND_MESSAGE": "append_message",
    "NEW_MESSAGE": "new_message",
    "REMOVE_USER": "remove_user"
};


function invoke(action, data) {
    console.log("invoke : " + action);
    switch (action) {

        case chat.actions.START_CHAT:
            $("#chat-uuid").text("Chat ID : " + chat.CHAT_ID);
            $("#send-button").prop('disabled', false);
            $("#message").prop('disabled', false);
            $("#message").prop('');
            $("#login-container").hide(500);
            $("#chat-container").show(500);
            break;

        case chat.actions.DISCONNECT_CHAT:
            $("#send-button").prop('disabled', true);
            $("#message").prop('disabled', true);
            $("#message").prop('value', "You were kicked off from the chat - " + data.from);
            break;

        case chat.actions.APPEND_MESSAGE:
            var from = data.from;
            var msg = data.message;
            var template = '<tr>' +
                '<td style="width: 150px"><strong>{{from}}</strong></td>' +
                '<td>{{message}}</td>' +
                '</tr>';
            template = template.replace("{{from}}", from);
            template = template.replace("{{message}}", msg);
            $('#chat-log > tbody:last-child').append(template);
            $('.chat-view').animate({
                scrollTop: $('.chat-view').get(0).scrollHeight
            }, 2000);
            break;

        case chat.actions.UPDATE_USERS:
            var users = data.users;
            $('#active-users > tbody').empty();
            for (var i = 0; i < users.length; i++) {
                var template = '<tr>' +
                    '<td>{{user}}</td>' +
                    '<td>' +
                    '<button id="{{id}}" type="button" class="btn btn-danger btn-xs remove-user">X</button>' +
                    '</td>' +
                    '</tr>';
                template = template.replace("{{user}}", users[i]);
                template = template.replace("{{id}}", users[i]);
                $('#active-users > tbody:last-child').append(template);
            }
            $('#active-users').delegate('.remove-user', 'click', function () {
                var id = $(this).prop('id');
                chat.disconnectUser(id);
                return false;
            });
            break;

        default:
            break;
    }
}


chat.init = function (user) {
    chat.USER = user;
    chat.socket = new WebSocket(chat.SERVER);

    chat.socket.onopen = function () {
        console.info("connection established");
    };

    chat.socket.onclose = function () {
    };

    chat.socket.onmessage = function (event) {
        chat.receive(JSON.parse(event.data));
    };

    chat.socket.onopen();

    $(window).on('beforeunload', function () {
        chat.socket.close();
    });
};


chat.receive = function (data) {
    console.log(JSON.stringify(data));
    invoke(data.action, data.data);
};


chat.newChat = function (chat_id) {
    chat.send(
        JSON.stringify({
            "action": chat.actions.INITIATE_CHAT,
            "data": {
                "from": chat.USER,
                "chat": chat_id,
                "time": chat.time()
            }
        }), null);
};


chat.newMessage = function (message) {
    chat.send(
        JSON.stringify({
            "action": chat.actions.NEW_MESSAGE,
            "data": {
                "from": chat.USER,
                "chat": chat.CHAT_ID,
                "time": chat.time(),
                "message": message
            }
        }), null);
};


chat.disconnectUser = function (userID) {
    chat.send(
        JSON.stringify({
            "action": chat.actions.REMOVE_USER,
            "data": {
                "from": chat.USER,
                "chat": chat.CHAT_ID,
                "time": chat.time(),
                "user": userID
            }
        }), null);
};


chat.send = function (data, callback) {
    chat.waitForConnection(function () {
        chat.socket.send(data);
        if (typeof callback !== 'undefined' && callback !== null) {
            callback();
        }
    }, chat.SOCKET_WAIT);
};


chat.waitForConnection = function (callback, interval) {
    if (chat.socket.readyState === 1) {
        callback();
    } else {
        console.log("waiting for the socket : " + chat.socket.readyState);
        setTimeout(function () {
            chat.waitForConnection(callback, interval);
        }, interval);
    }
};


chat.time = function () {
    var date = new Date();
    return date.getTime();
};


chat.generateUUID = function () {
    var d = chat.time();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
};


$(document).ready(function () {

    $("#chat-login").submit(function (event) {
        event.preventDefault();
        chat.USER = $("#user_id").val();
        chat.CHAT_ID = $("#chat_id").val();
        chat.init(chat.USER);
        console.log("init done");
        chat.newChat(chat.CHAT_ID);
        console.log("new done");
        return;
    });

    $("#chat-message").submit(function (event) {
        event.preventDefault();
        var message = $("#message").val();
        chat.newMessage(message);
        $("#message").val("");
        return;
    });

    $("#existing-chat").change(function () {
        var state = $(this);
        if (state.is(":checked")) {
            $("#chat_id").prop('disabled', false);
            $("#chat_id").prop('value', "");
            $("#chat_id").prop("placeholder", "Existing Private Chat ID");
            console.log("checked");
        } else {
            $("#chat_id").prop('disabled', true);
            $("#chat_id").prop('value', chat.generateUUID());
            console.log("unchecked");
        }
    }).change();
});

