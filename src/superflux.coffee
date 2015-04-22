m = require('mithril')


module.exports = class SuperFlux
    constructor: (args) ->
        @socket = args.socket or ->
        @requestAuthHeaderKey = args.requestAuthHeaderKey or null
        @requestAuthHeaderValue = args.requestAuthHeaderValue or null

        @actions = {}
        @stores = {}
        @callbacks = {}

    setAuthHeader: (key, value) ->
        @requestAuthHeaderKey = key
        @requestAuthHeaderValue = value
    createStore: (store) ->
        store.notify = m.redraw

        for key, value of store

            # Register functions in the store as listeners if they start with 'on'
            if typeof(value) == 'function' and key.startsWith('on')

                # Extract the action name from the function name:
                # onCreateTodo -> createTodo
                actionName = key[2].toLowerCase() + key[3..]

                if actionName not of @callbacks
                    @callbacks[actionName] = []
                @callbacks[actionName].push(value.bind(store))

        # Call the constructor if present
        if 'init' of store
            store.init()

        store.waitFor = (otherStore) ->


        return store

    createActions: (spec) ->
        socketListen = spec.socketListen or []
        socketEmit = spec.socketEmit or []
        local = spec.local or []
        async = spec.async or {}

        callbacks = @callbacks
        actions = @actions

        local.map (name) ->
            actions[name] = (args) ->
                if name of callbacks
                    for callback in callbacks[name]
                        callback(args)

        socket = @socket
        socketListen.map (name) ->
            socket.on name, (data) ->
                if name of callbacks
                    for callback in callbacks[name]
                        callback(data)

        socketEmit.map (name) ->
            actions[name] = (args) ->
                socket.emit(name, args)
                if name of callbacks
                    for callback in callbacks[name]
                        callback(args)
                
        requestAuthHeaderKey = @requestAuthHeaderKey
        requestAuthHeaderValue = @requestAuthHeaderValue
        Object.keys(async).map (name) ->
            configFn = async[name]

            successFnName = name + 'Success'
            failureFnName = name + 'Failure'

            successFn = (res) ->
                if successFnName of callbacks
                    for callback in callbacks[successFnName]
                        callback(res)

            failureFn = (res) ->
                if failureFnName of callbacks
                    for callback in callbacks[failureFnName]
                        callback(res)

            actions[successFnName] = successFn
            actions[failureFnName] = failureFn

            actions[name] = (args) ->
                if name of callbacks
                    for callback in callbacks[name]
                        callback(args)

                options = configFn(args)
                m.request
                    method: options.method
                    url: options.url
                    data: options.data
                    background: true
                    config: (xhr) ->
                        xhr.setRequestHeader('Content-Type', 'application/json')
                        if requestAuthHeaderKey? and requestAuthHeaderValue?
                            xhr.setRequestHeader(
                                requestAuthHeaderKey
                                requestAuthHeaderValue
                            )
                .then(successFn, failureFn)

        return @actions
