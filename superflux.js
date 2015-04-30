var m = require('mithril');

// Thanks to http://stackoverflow.com/a/8809472/356789
function generateUUID(){
    var d = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
};


var SUPERFLUX = function(args) {
    if (args == null) {
        args = {};
    }
    var socket = args.socket || function(){};
    var requestAuthHeaderKey = args.requestAuthHeaderKey || null;
    var requestAuthHeaderValue = args.requestAuthHeaderValue || null;
    
    var successMiddleware = args.successMiddleware || function(res){return res;};
    var failureMiddleware = args.failureMiddleware || function(res){return res;};

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
                socket.on(name, function(res) {
                    if (name in callbacks) {
                        for (var i = 0; i < callbacks[name].length; i++) {
                            var callback = callbacks[name][i];
                            callback(res);
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
                            callback(res);
                        }
                    }
                };

                var failureFn = function(res) {
                    if (failureFnName in callbacks) {
                        for (var i = 0; i < callbacks[failureFnName].length; i++) {
                            var callback = callbacks[failureFnName][i];
                            callback(res);
                        }
                    }
                };

                actions[successFnName] = successFn;
                actions[failureFnName] = failureFn;

                actions[name] = function(args) {
                    // Pass the same uuid to initial and result callbacks to tie them together
                    var uuid = generateUUID();
                    if (name in callbacks) {
                        for (var i = 0; i < callbacks[name].length; i++) {
                            var callback = callbacks[name][i];
                            callback(args, uuid);
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
                    .then(
                        function(res) {
                            if ('requestSuccess' in callbacks) {
                                for (var i = 0; i < callbacks.requestSuccess.length; i++) {
                                    var callback = callbacks.requestSuccess[i];
                                    callback(res);
                                }
                            }
                            return res;
                        },
                        function(err) {
                            if ('requestFailure' in callbacks) {
                                for (var i = 0; i < callbacks.requestFailure.length; i++) {
                                    var callback = callbacks.requestFailure[i];
                                    callback(err);
                                }
                            }
                            throw err;
                        }
                    )
                    .then(function(successRes) {
                        successFn(successRes, uuid);
                    }, function(failureRes) {
                        failureFn(failureRes, uuid);
                    });
                };
            });

            return actions;
        }
    };
};

module.exports = SUPERFLUX;
