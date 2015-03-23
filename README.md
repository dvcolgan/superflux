# Hornburg!

Opinionated model layer for Mithril based on Flux

## Motivation

In my book, Mithril.js is the best thing since CSS preprocessors for front end dev.  But as a relatively young dev in the grand scheme of things, I am not the best when it comes to architecting grand code architectures.  Mithril has great support for the view and controller part of the MVC triangle, but doesn't make any prescriptions about the model layer.

Coming from a Django background with its opinionated opinions on where everything should go, I am a big fan of convention over configuration.  When the Facebook Flux idea started gaining hype, I was excited, because here was some rails for the model layer of the single page app.

After trying most of the 10 different implementations of the Flux pattern, I was still unsatisfied because none of them seemed to address both of two problems I saw: where do you put AJAX and/or websocket request code, and why is there so much boilerplate?

Coming from the Paul Graham school of "code brevity is next to godliness," it was frustrating to have to duplicate the names of each action many times over the course of the codebase.  Also all of the documentation and example code for most of these libraries were simplistic todo list apps, which were good for showing off the libraries' features, but I don't know that very many people build a single page app without some kind of API integration.

And so, like all good little programmers, I decided that I could do one better.  Also all of the Flux libraries only seem to want to play nicely with React.js, which is cool for me, Mithril is simpler to understand and less verbose, so I made a Flux for Mithril.  I'm also hoping to add a full example with API, as I think I've got a way of doing it cleanly here.

In keeping with the theme of fantasy/Tolkein references, this library is called Hornburg, after the fortress in the Two Towers because it holds your data.

Is this all a good idea?  We'll shall see.

## Installation

    npm install hornburg

## Usage

Currently you must be using Browserify or something similar that allows you to `require` packages installed from npm.  In a file in the root of your project, perhaps in a file called `flux.js`, create an instance of hornburg and export it for the app to use.  If you are going to be using socket.io, create a new socket and pass it in as well:

    var Hornburg = require('hornburg')
    var io = require('socket.io-client')

    var flux = new Hornburg({socket: io()});
    module.exports = flux;

Then, somewhere, perhaps in a file called `actions.js`, declare your flux actions.  `flux.createActions` can create 4 different types of actions:

    * `local`: normal flux actions
    * `socketListen`: only fired when a socket request comes in from the server with the action's name
    * `socketEmit`: when fired, these actions also send their payload to the server with a name the same as the action's name
    * `async`: when fired, a local action is fired, as well as an ajax request with the same payload.  When the request comes back, an action called `<actionname>Success` is fired if the ajax request is successful, or `<actionname>Failure` if the request fails.

    var flux = require('path/to/flux.js');

    module.exports = flux.createActions({
        socketListen: [
            'welcome'
            'userJoined'
            'userDisconnected'
            'chatMessageReceived'
        ],

        socketEmit: [
            'mapSectorNeeded'
            'chatMessageCreate'
            'userNameChange'
        ],

        local: [
            'uiToggle'
        ]

        async: {
            'login': function(data) {
                method: 'POST'
                url: '/auth/login'
                data: data
            },
            'usernameExists': function(data) {
                method: 'GET'
                url:
            },
            'userCreate': function(data) {
                method: 'POST'
                url: '/users'
                data: data
            },
            'userList': function() {
                method: 'GET'
                url: '/users'
            }
        }
    });
