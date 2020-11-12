//http://localhost:3000/

var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

// split every 3 characters to get r g b values
var userColors = ["220020060", "255215000", "255218185", "144238144", "000206209", "135206250", "255182193", "245222179"];
var usernames = ["user1", "user2", "user3", "user4", "user5", "user6", "user7", "user8"];
let counter = 0;

// Connection object - for user info such as socket ID, color, and username
const connection = {
    id: "",
    username: "",
    color: ""
}

// Message object - for message info such as who sent it, the message itself, and time
const message = {
    sender: "",
    color: "",
    message: "",
    timestamp: ""
}

// Two arrays to hold all the information
const history = [];
const users = [];


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {

    console.log('a user connected'); // Debugging

    // Create a user object
    const user = Object.create(connection);
    // Assign it information - socketID, username, color
    user.id = socket.id;
    user.username = usernames[counter];
    user.color = userColors[counter];
    console.log(user); // Debugging

    // Add the user to the array of online users
    users.push(user);
    io.emit('update users', users);
    // Increase the counter so it is ready for the next user
    counter++;

    // Emit the new user event end the user/connection object to the client-side
    io.emit('new user', user);

    // socket.emit will send the content to only the new user
    socket.emit('new name', user.username, user);
    console.log("current active users:" + users); // Debugging

    // if there is history, send it to the client side
    if (history.length !== 0) {
        socket.emit('history', history); // send the history object to the client-side
    }
    //io.emit('history', history); // send the history object to the client-side


    // needs to be checked on the client side to update active users list
    socket.on('disconnect', () => {
        console.log('user disconnected'); // Debugging
        for(let i = 0; i < users.length; i++) {
            if (user.username === users[i].username) {
                console.log("Deleting user: " + users[i].username);
                delete users[i];
            }
        }

        io.emit('update users', users);
    });

    socket.on('chat message', (msg) => {
        console.log('message: ' + msg); // Debugging

        // Replace emoticons with emojis
        // Replace all doesnt work for some reason
        msg = msg.replace(":)", "😄");
        msg = msg.replace(":(", "🙁");
        msg = msg.replace(":o", "😲");
        msg = msg.replace(":D", "🥳");
        msg = msg.replace("B)", "😎");

        // Getting the unix timestamp and converting it to current time
        let unixTime = Math.floor(Date.now()/1000);
        let date = new Date(unixTime * 1000);
        let hours = date.getHours();
        let mins = "0" + date.getMinutes();
        let secs = "0" + date.getSeconds();
        let time = hours + ":" + mins.substr(-2) + ":" + secs.substr(-2);

        // Add message and its information (sender, color, time, and content) to the chat history
        const msgHistory = Object.create(message);
        msgHistory.sender = user.username;
        msgHistory.color = user.color;
        msgHistory.timestamp = time;
        msgHistory.message = msg;
        console.log("New message added to history: " + msgHistory); //Debugging


        // Checking if the user was trying to change their username or color
        if (msg.includes("/name")) {
            // get the new username and update it in the users array
            let newUsername;
            newUsername = msg.slice(5, msg.length);
            for (let i = 0; i < users.length; i++) {
                if (users[i].username === newUsername) {
                    console.log("username already taken")
                    break;
                }
                else if (users[i].username === msgHistory.sender) {
                    users[i].username = newUsername;
                }
                console.log("User " + i + ": " + users[i].username);
            }
            msg = "You username has been changed to " + newUsername;
            //user.username = newUsername;
            socket.emit('name change', msg, time, newUsername);
            // no need to store the name change message
            //history.pop();
            io.emit('update users', users);
        }

        else if (msg.includes("/color")) {
            let username, colorValue, colorRGB, r, g, b;
            // Remove the /color from the string and update the user's display color
            colorValue = msg.slice(7, msg.length);
            // Make sure the user entered the color in the right format
            if (colorValue.length !== 9) {
                msg = "Please enter your new colour as /color RRRGGGBBB";
            }
            else {
                r = colorValue.slice(0, 3);
                g = colorValue.slice(3, 6);
                b = colorValue.slice(6, 9);
                colorRGB = "rgb(" + r + "," + g + "," + b+ ")";
                for (let i = 0; i < users.length; i++) {
                    if (users[i].color === msgHistory.color) {
                        users[i].color = colorValue;
                        username = users[i].username;
                    }
                    console.log("Color " + i + ": " + users[i].color);
                }
                msg = "You changed your colour to " + user.color;
                socket.emit('color change', msg, time, colorRGB, username)
            }
            //history.pop();
        }
        else {
            history.push(msgHistory);
            // Send message to everyone on the chat  but the sender
            socket.broadcast.emit('chat message', msgHistory); // "emit" will send to everyone, including the sender
            // Send the message to the sender but bold the message
            socket.emit('bold message', msgHistory);
        }
    });
});


http.listen(3000, () => {
    console.log('listening on *:3000');
});
