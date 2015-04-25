var m = require('mithril');


var SUPERFLUX = function(args) {
    if (args == null) {
        args = {};
    }
    var socket = args.socket || function(){};
    var requestAuthHeaderKey = args.requestAuthHeaderKey || null;
    var requestAuthHeaderValue = args.requestAuthHeaderValue || null;

    var actions = {};
    var stores = {};
    var callbacks = {};

    return {
        setAuthHeader: function(key, value) {
            requestAuthHeaderKey = key;
            requestAuthHeaderValue = value;
        },
        createStore: function(store) {
            store.notify = m.redraw;

            for (key in store) {
                var value = store[key];

                // Register functions in the store as listeners if they start with 'on'
                if (typeof(value) === 'function' && key.slice(0, 2) === 'on') {

                    // Extract the action name from the function name:
                    // onCreateTodo -> createTodo
                    var actionName = key[2].toLowerCase() + key.slice(3);

                    if (!(actionName in callbacks)) {
                        callbacks[actionName] = [];
                    }
                    callbacks[actionName].push(value.bind(store));
                }
            }

            // Call the constructor if present
            if ('init' in store) {
                store.init();
            }

            return store;
        },

        createActions: function(spec) {
            var socketListen = spec.socketListen || [];
            var socketEmit = spec.socketEmit || [];
            var local = spec.local || [];
            var async = spec.async || {};

            local.map(function(name) {
                actions[name] = function(args) {
                    if (name in callbacks) {
                        for (var i = 0; i < callbacks[name].length; i++) {
                            var callback = callbacks[name][i];
                            callback(args);
                        }
                    }
                };
            });

            socketListen.map(function(name) {
                socket.on(name, function(data) {
                    if (name in callbacks) {
                        for (var i = 0; i < callbacks[name].length; i++) {
                            var callback = callbacks[name][i];
                            callback(args);
                        }
                    }
                });
            });

            socketEmit.map(function(name) {
                actions[name] = function(args) {
                    socket.emit(name, args);
                    if (name in callbacks) {
                        for (var i = 0; i < callbacks[name].length; i++) {
                            var callback = callbacks[name][i];
                            callback(args);
                        }
                    }
                };
            });
                    
            Object.keys(async).map(function(name) {
                var configFn = async[name];

                var successFnName = name + 'Success';
                var failureFnName = name + 'Failure';

                var successFn = function(res) {
                    if (successFnName in callbacks) {
                        for (var i = 0; i < callbacks[successFnName].length; i++) {
                            var callback = callbacks[successFnName][i];
                            callback(args);
                        }
                    }
                };

                var failureFn = function(res) {
                    if (failureFnName in callbacks) {
                        for (var i = 0; i < callbacks[failureFnName].length; i++) {
                            var callback = callbacks[failureFnName][i];
                            callback(args);
                        }
                    }
                };

                actions[successFnName] = successFn;
                actions[failureFnName] = failureFn;

                actions[name] = function(args) {
                    if (name in callbacks) {
                        for (var i = 0; i < callbacks[failureFnName].length; i++) {
                            var callback = callbacks[failureFnName][i];
                            callback(args);
                        }
                    }

                    var options = configFn(args);
                    m.request({
                        method: options.method,
                        url: options.url,
                        data: options.data,
                        background: true,
                        config: function(xhr) {
                            xhr.setRequestHeader('Content-Type', 'application/json');
                            if (requestAuthHeaderKey != null && requestAuthHeaderValue != null) {
                                xhr.setRequestHeader(
                                    requestAuthHeaderKey,
                                    requestAuthHeaderValue
                                );
                            }
                        }
                    })
                    .then(successFn, failureFn);
                };
            });

            return actions;
        }
    };
};

module.exports = SUPERFLUX;
