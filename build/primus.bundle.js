(function (name, context, definition) {  context[name] = definition.call(context);  if (typeof module !== "undefined" && module.exports) {    module.exports = context[name];  } else if (typeof define == "function" && define.amd) {    define(function reference() { return context[name]; });  }})("Primus", this, function PRIMUS() {/*globals require, define */
'use strict';

/**
 * Minimal EventEmitter interface that is molded against the Node.js
 * EventEmitter interface.
 *
 * @constructor
 * @api public
 */
function EventEmitter() {
  this._events = {};
}

/**
 * Return a list of assigned event listeners.
 *
 * @param {String} event The events that should be listed.
 * @returns {Array}
 * @api public
 */
EventEmitter.prototype.listeners = function listeners(event) {
  return Array.apply(this, this._events[event] || []);
};

/**
 * Emit an event to all registered event listeners.
 *
 * @param {String} event The name of the event.
 * @returns {Boolean} Indication if we've emitted an event.
 * @api public
 */
EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
  if (!this._events || !this._events[event]) return false;

  var listeners = this._events[event]
    , length = listeners.length
    , len = arguments.length
    , fn = listeners[0]
    , args
    , i;

  if (1 === length) {
    if (fn.__EE3_once) this.removeListener(event, fn);

    switch (len) {
      case 1:
        fn.call(fn.__EE3_context || this);
      break;
      case 2:
        fn.call(fn.__EE3_context || this, a1);
      break;
      case 3:
        fn.call(fn.__EE3_context || this, a1, a2);
      break;
      case 4:
        fn.call(fn.__EE3_context || this, a1, a2, a3);
      break;
      case 5:
        fn.call(fn.__EE3_context || this, a1, a2, a3, a4);
      break;
      case 6:
        fn.call(fn.__EE3_context || this, a1, a2, a3, a4, a5);
      break;

      default:
        for (i = 1, args = new Array(len -1); i < len; i++) {
          args[i - 1] = arguments[i];
        }

        fn.apply(fn.__EE3_context || this, args);
    }
  } else {
    for (i = 1, args = new Array(len -1); i < len; i++) {
      args[i - 1] = arguments[i];
    }

    for (i = 0; i < length; fn = listeners[++i]) {
      if (fn.__EE3_once) this.removeListener(event, fn);
      fn.apply(fn.__EE3_context || this, args);
    }
  }

  return true;
};

/**
 * Register a new EventListener for the given event.
 *
 * @param {String} event Name of the event.
 * @param {Functon} fn Callback function.
 * @param {Mixed} context The context of the function.
 * @api public
 */
EventEmitter.prototype.on = function on(event, fn, context) {
  if (!this._events) this._events = {};
  if (!this._events[event]) this._events[event] = [];

  fn.__EE3_context = context;
  this._events[event].push(fn);

  return this;
};

/**
 * Add an EventListener that's only called once.
 *
 * @param {String} event Name of the event.
 * @param {Function} fn Callback function.
 * @param {Mixed} context The context of the function.
 * @api public
 */
EventEmitter.prototype.once = function once(event, fn, context) {
  fn.__EE3_once = true;
  return this.on(event, fn, context);
};

/**
 * Remove event listeners.
 *
 * @param {String} event The event we want to remove.
 * @param {Function} fn The listener that we need to find.
 * @api public
 */
EventEmitter.prototype.removeListener = function removeListener(event, fn) {
  if (!this._events || !this._events[event]) return this;

  var listeners = this._events[event]
    , events = [];

  for (var i = 0, length = listeners.length; i < length; i++) {
    if (fn && listeners[i] !== fn) {
      events.push(listeners[i]);
    }
  }

  //
  // Reset the array, or remove it completely if we have no more listeners.
  //
  if (events.length) this._events[event] = events;
  else this._events[event] = null;

  return this;
};

/**
 * Remove all listeners or only the listeners for the specified event.
 *
 * @param {String} event The event want to remove all listeners for.
 * @api public
 */
EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
  if (!this._events) return this;

  if (event) this._events[event] = null;
  else this._events = {};

  return this;
};

//
// Alias methods names because people roll like that.
//
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

//
// This function doesn't apply anymore.
//
EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
  return this;
};

/**
 * Context assertion, ensure that some of our public Primus methods are called
 * with the correct context to ensure that
 *
 * @param {Primus} self The context of the function.
 * @param {String} method The method name.
 * @api private
 */
function context(self, method) {
  if (self instanceof Primus) return;

  var failure = new Error('Primus#'+ method + '\'s context should called with a Primus instance');

  if ('function' !== typeof self.listeners || !self.listeners('error').length) {
    throw failure;
  }

  self.emit('error', failure);
}

//
// Sets the default connection URL, it uses the default origin of the browser
// when supported but degrades for older browsers. In Node.js, we cannot guess
// where the user wants to connect to, so we just default to localhost.
//
var defaultUrl;

try {
  if (location.origin) {
    defaultUrl = location.origin;
  } else {
    defaultUrl = location.protocol +'//'+ location.hostname + (location.port ? ':'+ location.port : '');
  }
} catch (e) {
  defaultUrl = 'http://127.0.0.1';
}

/**
 * Primus in a real-time library agnostic framework for establishing real-time
 * connections with servers.
 *
 * Options:
 * - reconnect, configuration for the reconnect process.
 * - manual, don't automatically call `.open` to start the connection.
 * - websockets, force the use of WebSockets, even when you should avoid them.
 * - timeout, connect timeout, server didn't respond in a timely manner.
 * - ping, The heartbeat interval for sending a ping packet to the server.
 * - pong, The heartbeat timeout for receiving a response to the ping.
 * - network, Use network events as leading method for network connection drops.
 * - strategy, Reconnection strategies.
 * - transport, Transport options.
 * - url, uri, The URL to use connect with the server.
 *
 * @constructor
 * @param {String} url The URL of your server.
 * @param {Object} options The configuration.
 * @api public
 */
function Primus(url, options) {
  if (!(this instanceof Primus)) return new Primus(url, options);
  if ('function' !== typeof this.client) {
    var message = 'The client library has not been compiled correctly, ' +
      'see https://github.com/primus/primus#client-library for more details';
    return this.critical(new Error(message));
  }

  if ('object' === typeof url) {
    options = url;
    url = options.url || options.uri || defaultUrl;
  } else {
    options = options || {};
  }

  var primus = this;

  // The maximum number of messages that can be placed in queue.
  options.queueSize = 'queueSize' in options ? options.queueSize : Infinity;

  // Connection timeout duration.
  options.timeout = 'timeout' in options ? options.timeout : 10e3;

  // Stores the back off configuration.
  options.reconnect = 'reconnect' in options ? options.reconnect : {};

  // Heartbeat ping interval.
  options.ping = 'ping' in options ? options.ping : 25000;

  // Heartbeat pong response timeout.
  options.pong = 'pong' in options ? options.pong : 10e3;

  // Reconnect strategies.
  options.strategy = 'strategy' in options ? options.strategy : [];

  // Custom transport options.
  options.transport = 'transport' in options ? options.transport : {};

  primus.buffer = [];                           // Stores premature send data.
  primus.writable = true;                       // Silly stream compatibility.
  primus.readable = true;                       // Silly stream compatibility.
  primus.url = primus.parse(url || defaultUrl); // Parse the URL to a readable format.
  primus.readyState = Primus.CLOSED;            // The readyState of the connection.
  primus.options = options;                     // Reference to the supplied options.
  primus.timers = {};                           // Contains all our timers.
  primus.attempt = null;                        // Current back off attempt.
  primus.socket = null;                         // Reference to the internal connection.
  primus.latency = 0;                           // Latency between messages.
  primus.stamps = 0;                            // Counter to make timestamps unqiue.
  primus.disconnect = false;                    // Did we receive a disconnect packet?
  primus.transport = options.transport;         // Transport options.
  primus.transformers = {                       // Message transformers.
    outgoing: [],
    incoming: []
  };

  //
  // Parse the reconnection strategy. It can have the following strategies:
  //
  // - timeout: Reconnect when we have a network timeout.
  // - disconnect: Reconnect when we have an unexpected disconnect.
  // - online: Reconnect when we're back online.
  //
  if ('string' === typeof options.strategy) {
    options.strategy = options.strategy.split(/\s?\,\s?/g);
  }

  if (false === options.strategy) {
    //
    // Strategies are disabled, but we still need an empty array to join it in
    // to nothing.
    //
    options.strategy = [];
  } else if (!options.strategy.length) {
    options.strategy.push('disconnect', 'online');

    //
    // Timeout based reconnection should only be enabled conditionally. When
    // authorization is enabled it could trigger.
    //
    if (!this.authorization) options.strategy.push('timeout');
  }

  options.strategy = options.strategy.join(',').toLowerCase();

  //
  // Only initialise the EventEmitter interface if we're running in a plain
  // browser environment. The Stream interface is inherited differently when it
  // runs on browserify and on Node.js.
  //
  if (!Stream) EventEmitter.call(primus);

  //
  // Force the use of WebSockets, even when we've detected some potential
  // broken WebSocket implementation.
  //
  if ('websockets' in options) {
    primus.AVOID_WEBSOCKETS = !options.websockets;
  }

  //
  // Force or disable the use of NETWORK events as leading client side
  // disconnection detection.
  //
  if ('network' in options) {
    primus.NETWORK_EVENTS = options.network;
  }

  //
  // Check if the user wants to manually initialise a connection. If they don't,
  // we want to do it after a really small timeout so we give the users enough
  // time to listen for `error` events etc.
  //
  if (!options.manual) primus.timers.open = setTimeout(function open() {
    primus.clearTimeout('open').open();
  }, 0);

  primus.initialise(options);
}

/**
 * Simple require wrapper to make browserify, node and require.js play nice.
 *
 * @param {String} name The module to require.
 * @api private
 */
Primus.require = function requires(name) {
  if ('function' !== typeof require) return undefined;

  return !('function' === typeof define && define.amd)
    ? require(name)
    : undefined;
};

//
// It's possible that we're running in Node.js or in a Node.js compatible
// environment such as browserify. In these cases we want to use some build in
// libraries to minimize our dependence on the DOM.
//
var Stream, parse;

try {
  Primus.Stream = Stream = Primus.require('stream');
  parse = Primus.require('url').parse;

  //
  // Normally inheritance is done in the same way as we do in our catch
  // statement. But due to changes to the EventEmitter interface in Node 0.10
  // this will trigger annoying memory leak warnings and other potential issues
  // outlined in the issue linked below.
  //
  // @see https://github.com/joyent/node/issues/4971
  //
  Primus.require('util').inherits(Primus, Stream);
} catch (e) {
  Primus.Stream = EventEmitter;
  Primus.prototype = new EventEmitter();

  //
  // In the browsers we can leverage the DOM to parse the URL for us. It will
  // automatically default to host of the current server when we supply it path
  // etc.
  //
  parse = function parse(url) {
    var a = document.createElement('a')
      , data = {}
      , key;

    a.href = url;

    //
    // Transform it from a readOnly object to a read/writable object so we can
    // change some parsed values. This is required if we ever want to override
    // a port number etc. (as browsers remove port 443 and 80 from the URL's).
    //
    for (key in a) {
      if ('string' === typeof a[key] || 'number' === typeof a[key]) {
        data[key] = a[key];
      }
    }

    //
    // If we don't obtain a port number (e.g. when using zombie) then try
    // and guess at a value from the 'href' value.
    //
    if (!data.port) {
      var splits = (data.href || '').split('/');
      if (splits.length > 2) {
        var host = splits[2]
          , atSignIndex = host.lastIndexOf('@');

        if (~atSignIndex) host = host.slice(atSignIndex + 1);

        splits = host.split(':');
        if (splits.length === 2) data.port = splits[1];
      }
    }

    //
    // IE quirk: The `protocol` is parsed as ":" when a protocol agnostic URL
    // is used. In this case we extract the value from the `href` value.
    //
    if (':' === data.protocol) {
      data.protocol = data.href.substr(0, data.href.indexOf(':') + 1);
    }

    //
    // Safari 5.1.7 (windows) quirk: When parsing a URL without a port number
    // the `port` in the data object will default to "0" instead of the expected
    // "". We're going to do an explicit check on "0" and force it to "".
    //
    if ('0' === data.port) data.port = '';

    //
    // Browsers do not parse authorization information, so we need to extract
    // that from the URL.
    //
    if (~data.href.indexOf('@') && !data.auth) {
      var start = data.protocol.length + 2;
      data.auth = data.href.slice(start, data.href.indexOf(data.pathname, start)).split('@')[0];
    }

    return data;
  };
}

/**
 * Primus readyStates, used internally to set the correct ready state.
 *
 * @type {Number}
 * @private
 */
Primus.OPENING = 1;   // We're opening the connection.
Primus.CLOSED  = 2;   // No active connection.
Primus.OPEN    = 3;   // The connection is open.

/**
 * Are we working with a potentially broken WebSockets implementation? This
 * boolean can be used by transformers to remove `WebSockets` from their
 * supported transports.
 *
 * @type {Boolean}
 * @api private
 */
Primus.prototype.AVOID_WEBSOCKETS = false;

/**
 * Some browsers support registering emitting `online` and `offline` events when
 * the connection has been dropped on the client. We're going to detect it in
 * a simple `try {} catch (e) {}` statement so we don't have to do complicated
 * feature detection.
 *
 * @type {Boolean}
 * @api private
 */
Primus.prototype.NETWORK_EVENTS = false;
Primus.prototype.online = true;

try {
  if (
       Primus.prototype.NETWORK_EVENTS = 'onLine' in navigator
    && (window.addEventListener || document.body.attachEvent)
  ) {
    if (!navigator.onLine) {
      Primus.prototype.online = false;
    }
  }
} catch (e) { }

/**
 * The Ark contains all our plugins definitions. It's namespaced by
 * name => plugin.
 *
 * @type {Object}
 * @private
 */
Primus.prototype.ark = {};

/**
 * Return the given plugin.
 *
 * @param {String} name The name of the plugin.
 * @returns {Mixed}
 * @api public
 */
Primus.prototype.plugin = function plugin(name) {
  context(this, 'plugin');

  if (name) return this.ark[name];

  var plugins = {};

  for (name in this.ark) {
    plugins[name] = this.ark[name];
  }

  return plugins;
};

/**
 * Checks if the given event is an emitted event by Primus.
 *
 * @param {String} evt The event name.
 * @returns {Boolean}
 * @api public
 */
Primus.prototype.reserved = function reserved(evt) {
  return (/^(incoming|outgoing)::/).test(evt)
  || evt in this.reserved.events;
};

/**
 * The actual events that are used by the client.
 *
 * @type {Object}
 * @api public
 */
Primus.prototype.reserved.events = {
  readyStateChange: 1,
  reconnecting: 1,
  reconnect: 1,
  offline: 1,
  timeout: 1,
  online: 1,
  error: 1,
  close: 1,
  open: 1,
  data: 1,
  end: 1
};

/**
 * Initialise the Primus and setup all parsers and internal listeners.
 *
 * @param {Object} options The original options object.
 * @api private
 */
Primus.prototype.initialise = function initialise(options) {
  var primus = this
    , start;

  primus.on('outgoing::open', function opening() {
    var readyState = primus.readyState;

    primus.readyState = Primus.OPENING;
    if (readyState !== primus.readyState) {
      primus.emit('readyStateChange', 'opening');
    }

    start = +new Date();
  });

  primus.on('incoming::open', function opened() {
    if (primus.attempt) primus.attempt = null;

    //
    // The connection has been openend so we should set our state to
    // (writ|read)able so our stream compatibility works as intended.
    //
    primus.writable = true;
    primus.readable = true;

    var readyState = primus.readyState;

    primus.readyState = Primus.OPEN;
    if (readyState !== primus.readyState) {
      primus.emit('readyStateChange', 'open');
    }

    primus.latency = +new Date() - start;

    primus.emit('open');
    primus.clearTimeout('ping', 'pong').heartbeat();

    if (primus.buffer.length) {
      for (var i = 0, length = primus.buffer.length; i < length; i++) {
        primus._write(primus.buffer[i]);
      }

      primus.buffer = [];
    }
  });

  primus.on('incoming::pong', function pong(time) {
    primus.online = true;
    primus.clearTimeout('pong').heartbeat();

    primus.latency = (+new Date()) - time;
  });

  primus.on('incoming::error', function error(e) {
    var connect = primus.timers.connect;

    //
    // We're still doing a reconnect attempt, it could be that we failed to
    // connect because the server was down. Failing connect attempts should
    // always emit an `error` event instead of a `open` event.
    //
    if (primus.attempt) return primus.reconnect();
    if (primus.listeners('error').length) primus.emit('error', e);

    //
    // We received an error while connecting, this most likely the result of an
    // unauthorized access to the server. But this something that is only
    // triggered for Node based connections. Browsers trigger the error event.
    //
    if (connect) {
      if (~primus.options.strategy.indexOf('timeout')) primus.reconnect();
      else primus.end();
    }
  });

  primus.on('incoming::data', function message(raw) {
    primus.decoder(raw, function decoding(err, data) {
      //
      // Do a "save" emit('error') when we fail to parse a message. We don't
      // want to throw here as listening to errors should be optional.
      //
      if (err) return primus.listeners('error').length && primus.emit('error', err);

      //
      // Handle all "primus::" prefixed protocol messages.
      //
      if (primus.protocol(data)) return;
      primus.transforms(primus, primus, 'incoming', data, raw);
    });
  });

  primus.on('incoming::end', function end() {
    var readyState = primus.readyState;

    //
    // This `end` started with the receiving of a primus::server::close packet
    // which indicated that the user/developer on the server closed the
    // connection and it was not a result of a network disruption. So we should
    // kill the connection without doing a reconnect.
    //
    if (primus.disconnect) {
      primus.disconnect = false;
      return primus.end();
    }

    //
    // Always set the readyState to closed, and if we're still connecting, close
    // the connection so we're sure that everything after this if statement block
    // is only executed because our readyState is set to `open`.
    //
    primus.readyState = Primus.CLOSED;
    if (readyState !== primus.readyState) {
      primus.emit('readyStateChange', 'end');
    }

    if (primus.timers.connect) primus.end();
    if (readyState !== Primus.OPEN) return;

    this.writable = false;
    this.readable = false;

    //
    // Clear all timers in case we're not going to reconnect.
    //
    for (var timeout in this.timers) {
      this.clearTimeout(timeout);
    }

    //
    // Fire the `close` event as an indication of connection disruption.
    // This is also fired by `primus#end` so it is emitted in all cases.
    //
    primus.emit('close');

    //
    // The disconnect was unintentional, probably because the server has
    // shutdown, so if the reconnection is enabled start a reconnect procedure.
    //
    if (~primus.options.strategy.indexOf('disconnect')) {
      return primus.reconnect();
    }

    primus.emit('outgoing::end');
    primus.emit('end');
  });

  //
  // Setup the real-time client.
  //
  primus.client();

  //
  // Process the potential plugins.
  //
  for (var plugin in primus.ark) {
    primus.ark[plugin].call(primus, primus, options);
  }

  //
  // NOTE: The following code is only required if we're supporting network
  // events as it requires access to browser globals.
  //
  if (!primus.NETWORK_EVENTS) return primus;

  /**
   * Handler for offline notifications.
   *
   * @api private
   */
  function offline() {
    if (!primus.online) return; // Already or still offline, bailout.

    primus.online = false;
    primus.emit('offline');
    primus.end();
  }

  /**
   * Handler for online notifications.
   *
   * @api private
   */
  function online() {
    if (primus.online) return; // Already or still online, bailout

    primus.online = true;
    primus.emit('online');

    if (~primus.options.strategy.indexOf('online')) primus.reconnect();
  }

  if (window.addEventListener) {
    window.addEventListener('offline', offline, false);
    window.addEventListener('online', online, false);
  } else if (document.body.attachEvent){
    document.body.attachEvent('onoffline', offline);
    document.body.attachEvent('ononline', online);
  }

  return primus;
};

/**
 * Really dead simple protocol parser. We simply assume that every message that
 * is prefixed with `primus::` could be used as some sort of protocol definition
 * for Primus.
 *
 * @param {String} msg The data.
 * @returns {Boolean} Is a protocol message.
 * @api private
 */
Primus.prototype.protocol = function protocol(msg) {
  if (
       'string' !== typeof msg
    || msg.indexOf('primus::') !== 0
  ) return false;

  var last = msg.indexOf(':', 8)
    , value = msg.slice(last + 2);

  switch (msg.slice(8,  last)) {
    case 'pong':
      this.emit('incoming::pong', value);
    break;

    case 'server':
      //
      // The server is closing the connection, forcefully disconnect so we don't
      // reconnect again.
      //
      if ('close' === value) {
        this.disconnect = true;
      }
    break;

    case 'id':
      this.emit('incoming::id', value);
    break;

    //
    // Unknown protocol, somebody is probably sending `primus::` prefixed
    // messages.
    //
    default:
      return false;
  }

  return true;
};

/**
 * Execute the set of message transformers from Primus on the incoming or
 * outgoing message.
 * This function and it's content should be in sync with Spark#transforms in
 * spark.js.
 *
 * @param {Primus} primus Reference to the Primus instance with message transformers.
 * @param {Spark|Primus} connection Connection that receives or sends data.
 * @param {String} type The type of message, 'incoming' or 'outgoing'.
 * @param {Mixed} data The data to send or that has been received.
 * @param {String} raw The raw encoded data.
 * @returns {Primus}
 * @api public
 */
Primus.prototype.transforms = function transforms(primus, connection, type, data, raw) {
  var packet = { data: data }
    , fns = primus.transformers[type];

  //
  // Iterate in series over the message transformers so we can allow optional
  // asynchronous execution of message transformers which could for example
  // retrieve additional data from the server, do extra decoding or even
  // message validation.
  //
  (function transform(index, done) {
    var transformer = fns[index++];

    if (!transformer) return done();

    if (1 === transformer.length) {
      if (false === transformer.call(connection, packet)) {
        //
        // When false is returned by an incoming transformer it means that's
        // being handled by the transformer and we should not emit the `data`
        // event.
        //
        return;
      }

      return transform(index, done);
    }

    transformer.call(connection, packet, function finished(err, arg) {
      if (err) return connection.emit('error', err);
      if (false === arg) return;

      transform(index, done);
    });
  }(0, function done() {
    //
    // We always emit 2 arguments for the data event, the first argument is the
    // parsed data and the second argument is the raw string that we received.
    // This allows you, for exampele, to do some validation on the parsed data
    // and then save the raw string in your database without the stringify
    // overhead.
    //
    if ('incoming' === type) return connection.emit('data', packet.data, raw);

    connection._write(packet.data);
  }));

  return this;
};

/**
 * Retrieve the current id from the server.
 *
 * @param {Function} fn Callback function.
 * @api public
 */
Primus.prototype.id = function id(fn) {
  if (this.socket && this.socket.id) return fn(this.socket.id);

  this.write('primus::id::');
  return this.once('incoming::id', fn);
};

/**
 * Establish a connection with the server. When this function is called we
 * assume that we don't have any open connections. If you do call it when you
 * have a connection open, it could cause duplicate connections.
 *
 * @api public
 */
Primus.prototype.open = function open() {
  context(this, 'open');

  //
  // Only start a `connection timeout` procedure if we're not reconnecting as
  // that shouldn't count as an initial connection. This should be started
  // before the connection is opened to capture failing connections and kill the
  // timeout.
  //
  if (!this.attempt && this.options.timeout) this.timeout();

  return this.emit('outgoing::open');
};

/**
 * Send a new message.
 *
 * @param {Mixed} data The data that needs to be written.
 * @returns {Boolean} Always returns true.
 * @api public
 */
Primus.prototype.write = function write(data) {
  context(this, 'write');
  this.transforms(this, this, 'outgoing', data);

  return true;
};

/**
 * The actual message writer.
 *
 * @param {Mixed} data The message that needs to be written.
 * @returns {Boolean}
 * @api private
 */
Primus.prototype._write = function write(data) {
  var primus = this;

  //
  // The connection is closed, normally this would already be done in the
  // `spark.write` method, but as `_write` is used internally, we should also
  // add the same check here to prevent potential crashes by writing to a dead
  // socket.
  //
  if (Primus.OPEN !== primus.readyState) {
    //
    // If the buffer is at capacity, remove the first item.
    //
    if (this.buffer.length === this.options.queueSize) {
      this.buffer.splice(0, 1);
    }

    this.buffer.push(data);
    return false;
  }

  primus.encoder(data, function encoded(err, packet) {
    //
    // Do a "save" emit('error') when we fail to parse a message. We don't
    // want to throw here as listening to errors should be optional.
    //
    if (err) return primus.listeners('error').length && primus.emit('error', err);
    primus.emit('outgoing::data', packet);
  });

  return true;
};

/**
 * Send a new heartbeat over the connection to ensure that we're still
 * connected and our internet connection didn't drop. We cannot use server side
 * heartbeats for this unfortunately.
 *
 * @api private
 */
Primus.prototype.heartbeat = function heartbeat() {
  var primus = this;

  if (!primus.options.ping) return primus;

  /**
   * Exterminate the connection as we've timed out.
   *
   * @api private
   */
  function pong() {
    primus.clearTimeout('pong');

    //
    // The network events already captured the offline event.
    //
    if (!primus.online) return;

    primus.online = false;
    primus.emit('offline');
    primus.emit('incoming::end');
  }

  /**
   * We should send a ping message to the server.
   *
   * @api private
   */
  function ping() {
    primus.clearTimeout('ping').write('primus::ping::'+ (+new Date));
    primus.emit('outgoing::ping');
    primus.timers.pong = setTimeout(pong, primus.options.pong);
  }

  primus.timers.ping = setTimeout(ping, primus.options.ping);
};

/**
 * Start a connection timeout.
 *
 * @api private
 */
Primus.prototype.timeout = function timeout() {
  var primus = this;

  /**
   * Remove all references to the timeout listener as we've received an event
   * that can be used to determine state.
   *
   * @api private
   */
  function remove() {
    primus.removeListener('error', remove)
          .removeListener('open', remove)
          .removeListener('end', remove)
          .clearTimeout('connect');
  }

  primus.timers.connect = setTimeout(function expired() {
    remove(); // Clean up old references.

    if (primus.readyState === Primus.OPEN || primus.attempt) return;

    primus.emit('timeout');

    //
    // We failed to connect to the server.
    //
    if (~primus.options.strategy.indexOf('timeout')) primus.reconnect();
    else primus.end();
  }, primus.options.timeout);

  return primus.on('error', remove)
    .on('open', remove)
    .on('end', remove);
};

/**
 * Properly clean up all `setTimeout` references.
 *
 * @param {String} ..args.. The names of the timeout's we need clear.
 * @api private
 */
Primus.prototype.clearTimeout = function clear() {
  for (var args = arguments, i = 0, l = args.length; i < l; i++) {
    if (this.timers[args[i]]) clearTimeout(this.timers[args[i]]);
    delete this.timers[args[i]];
  }

  return this;
};

/**
 * Exponential back off algorithm for retry operations. It uses an randomized
 * retry so we don't DDOS our server when it goes down under pressure.
 *
 * @param {Function} callback Callback to be called after the timeout.
 * @param {Object} opts Options for configuring the timeout.
 * @api private
 */
Primus.prototype.backoff = function backoff(callback, opts) {
  opts = opts || {};

  var primus = this;

  //
  // Bailout when we already have a backoff process running. We shouldn't call
  // the callback then as it might cause an unexpected `end` event as another
  // reconnect process is already running.
  //
  if (opts.backoff) return primus;

  opts.maxDelay = 'maxDelay' in opts ? opts.maxDelay : Infinity;  // Maximum delay.
  opts.minDelay = 'minDelay' in opts ? opts.minDelay : 500;       // Minimum delay.
  opts.retries = 'retries' in opts ? opts.retries : 10;           // Allowed retries.
  opts.attempt = (+opts.attempt || 0) + 1;                        // Current attempt.
  opts.factor = 'factor' in opts ? opts.factor : 2;               // Back off factor.

  //
  // Bailout if we are about to make to much attempts. Please note that we use
  // `>` because we already incremented the value above.
  //
  if (opts.attempt > opts.retries) {
    callback(new Error('Unable to retry'), opts);
    return primus;
  }

  //
  // Prevent duplicate back off attempts using the same options object.
  //
  opts.backoff = true;

  //
  // Calculate the timeout, but make it randomly so we don't retry connections
  // at the same interval and defeat the purpose. This exponential back off is
  // based on the work of:
  //
  // http://dthain.blogspot.nl/2009/02/exponential-backoff-in-distributed.html
  //
  opts.timeout = opts.attempt !== 1
    ? Math.min(Math.round(
        (Math.random() + 1) * opts.minDelay * Math.pow(opts.factor, opts.attempt)
      ), opts.maxDelay)
    : opts.minDelay;

  primus.timers.reconnect = setTimeout(function delay() {
    opts.backoff = false;
    primus.clearTimeout('reconnect');

    callback(undefined, opts);
  }, opts.timeout);

  //
  // Emit a `reconnecting` event with current reconnect options. This allows
  // them to update the UI and provide their users with feedback.
  //
  primus.emit('reconnecting', opts);

  return primus;
};

/**
 * Start a new reconnect procedure.
 *
 * @api private
 */
Primus.prototype.reconnect = function reconnect() {
  var primus = this;

  //
  // Try to re-use the existing attempt.
  //
  primus.attempt = primus.attempt || primus.clone(primus.options.reconnect);

  primus.backoff(function attempt(fail, backoff) {
    if (fail) {
      primus.attempt = null;
      return primus.emit('end');
    }

    //
    // Try to re-open the connection again.
    //
    primus.emit('reconnect', backoff);
    primus.emit('outgoing::reconnect');
  }, primus.attempt);

  return primus;
};

/**
 * Close the connection.
 *
 * @param {Mixed} data last packet of data.
 * @returns {Primus}
 * @api public
 */
Primus.prototype.end = function end(data) {
  context(this, 'end');

  if (this.readyState === Primus.CLOSED && !this.timers.connect) {
    //
    // If we are reconnecting stop the reconnection procedure.
    //
    if (this.timers.reconnect) {
      this.clearTimeout('reconnect');
      this.attempt = null;
      this.emit('end');
    }

    return this;
  }

  if (data) this.write(data);

  this.writable = false;
  this.readable = false;

  var readyState = this.readyState;
  this.readyState = Primus.CLOSED;

  if (readyState !== this.readyState) {
    this.emit('readyStateChange', 'end');
  }

  for (var timeout in this.timers) {
    this.clearTimeout(timeout);
  }

  this.emit('outgoing::end');
  this.emit('close');
  this.emit('end');

  return this;
};

/**
 * Create a shallow clone of a given object.
 *
 * @param {Object} obj The object that needs to be cloned.
 * @returns {Object} Copy.
 * @api private
 */
Primus.prototype.clone = function clone(obj) {
  return this.merge({}, obj);
};

/**
 * Merge different objects in to one target object.
 *
 * @param {Object} target The object where everything should be merged in.
 * @returns {Object} Original target with all merged objects.
 * @api private
 */
Primus.prototype.merge = function merge(target) {
  var args = Array.prototype.slice.call(arguments, 1);

  for (var i = 0, l = args.length, key, obj; i < l; i++) {
    obj = args[i];

    for (key in obj) {
      if (obj.hasOwnProperty(key)) target[key] = obj[key];
    }
  }

  return target;
};

/**
 * Parse the connection string.
 *
 * @param {String} url Connection URL.
 * @returns {Object} Parsed connection.
 * @api private
 */
Primus.prototype.parse = parse;

/**
 * Parse a query string.
 *
 * @param {String} query The query string that needs to be parsed.
 * @returns {Object} Parsed query string.
 * @api private
 */
Primus.prototype.querystring = function querystring(query) {
  var parser = /([^=?&]+)=([^&]*)/g
    , result = {}
    , part;

  //
  // Little nifty parsing hack, leverage the fact that RegExp.exec increments
  // the lastIndex property so we can continue executing this loop until we've
  // parsed all results.
  //
  for (;
    part = parser.exec(query);
    result[decodeURIComponent(part[1])] = decodeURIComponent(part[2])
  );

  return result;
};

/**
 * Transform a query string object back in to string equiv.
 *
 * @param {Object} obj The query string object.
 * @returns {String}
 * @api private
 */
Primus.prototype.querystringify = function querystringify(obj) {
  var pairs = [];

  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      pairs.push(encodeURIComponent(key) +'='+ encodeURIComponent(obj[key]));
    }
  }

  return pairs.join('&');
};

/**
 * Generates a connection URI.
 *
 * @param {String} protocol The protocol that should used to crate the URI.
 * @returns {String|options} The URL.
 * @api private
 */
Primus.prototype.uri = function uri(options) {
  var url = this.url
    , server = []
    , qsa = false;

  //
  // Query strings are only allowed when we've received clearance for it.
  //
  if (options.query) qsa = true;

  options = options || {};
  options.protocol = 'protocol' in options ? options.protocol : 'http';
  options.query = url.search && 'query' in options ? (url.search.charAt(0) === '?' ? url.search.slice(1) : url.search) : false;
  options.secure = 'secure' in options ? options.secure : (url.protocol === 'https:' || url.protocol === 'wss:');
  options.auth = 'auth' in options ? options.auth : url.auth;
  options.pathname = 'pathname' in options ? options.pathname : this.pathname.slice(1);
  options.port = 'port' in options ? +options.port : +url.port || (options.secure ? 443 : 80);
  options.host = 'host' in options ? options.host : url.hostname || url.host.replace(':'+ url.port, '');

  //
  // Allow transformation of the options before we construct a full URL from it.
  //
  this.emit('outgoing::url', options);

  //
  // `url.host` might be undefined (e.g. when using zombie) so we use the
  // hostname and port defined above.
  //
  var host = (443 !== options.port && 80 !== options.port)
    ? options.host +':'+ options.port
    : options.host;

  //
  // We need to make sure that we create a unique connection URL every time to
  // prevent bfcache back forward cache of becoming an issue. We're doing this
  // by forcing an cache busting query string in to the URL.
  //
  var querystring = this.querystring(options.query || '');
  querystring._primuscb = +new Date() +'-'+ this.stamps++;
  options.query = this.querystringify(querystring);

  //
  // Automatically suffix the protocol so we can supply `ws` and `http` and it gets
  // transformed correctly.
  //
  server.push(options.secure ? options.protocol +'s:' : options.protocol +':', '');

  if (options.auth) server.push(options.auth +'@'+ host);
  else server.push(host);

  //
  // Pathnames are optional as some Transformers would just use the pathname
  // directly.
  //
  if (options.pathname) server.push(options.pathname);

  //
  // Optionally add a search query, again, not supported by all Transformers.
  // SockJS is known to throw errors when a query string is included.
  //
  if (qsa) server.push('?'+ options.query);
  else delete options.query;

  if (options.object) return options;
  return server.join('/');
};

/**
 * Simple emit wrapper that returns a function that emits an event once it's
 * called. This makes it easier for transports to emit specific events. The
 * scope of this function is limited as it will only emit one single argument.
 *
 * @param {String} event Name of the event that we should emit.
 * @param {Function} parser Argument parser.
 * @api public
 */
Primus.prototype.emits = function emits(event, parser) {
  var primus = this;

  return function emit(arg) {
    var data = parser ? parser.apply(primus, arguments) : arg;

    //
    // Timeout is required to prevent crashes on WebSockets connections on
    // mobile devices. We need to handle these edge cases in our own library
    // as we cannot be certain that all frameworks fix these issues.
    //
    setTimeout(function timeout() {
      primus.emit('incoming::'+ event, data);
    }, 0);
  };
};

/**
 * Register a new message transformer. This allows you to easily manipulate incoming
 * and outgoing data which is particularity handy for plugins that want to send
 * meta data together with the messages.
 *
 * @param {String} type Incoming or outgoing
 * @param {Function} fn A new message transformer.
 * @api public
 */
Primus.prototype.transform = function transform(type, fn) {
  context(this, 'transform');

  if (!(type in this.transformers)) {
    return this.critical(new Error('Invalid transformer type'));
  }

  this.transformers[type].push(fn);
  return this;
};

/**
 * A critical error has occurred, if we have an `error` listener, emit it there.
 * If not, throw it, so we get a stack trace + proper error message.
 *
 * @param {Error} err The critical error.
 * @api private
 */
Primus.prototype.critical = function critical(err) {
  if (this.listeners('error').length) {
    this.emit('error', err);
    return this;
  }

  throw err;
};

/**
 * Syntax sugar, adopt a Socket.IO like API.
 *
 * @param {String} url The URL we want to connect to.
 * @param {Object} options Connection options.
 * @returns {Primus}
 * @api public
 */
Primus.connect = function connect(url, options) {
  return new Primus(url, options);
};

//
// Expose the EventEmitter so it can be re-used by wrapping libraries we're also
// exposing the Stream interface.
//
Primus.EventEmitter = EventEmitter;

//
// These libraries are automatically are automatically inserted at the
// server-side using the Primus#library method.
//
Primus.prototype.client = function client() {
  var primus = this
    , socket;

  //
  // Selects an available WebSocket constructor.
  //
  var Factory = (function factory() {
    if ('undefined' !== typeof WebSocket) return WebSocket;
    if ('undefined' !== typeof MozWebSocket) return MozWebSocket;

    try { return Primus.require('ws'); }
    catch (e) {}

    return undefined;
  })();

  if (!Factory) return primus.critical(new Error('Missing required `ws` module. Please run `npm install --save ws`'));


  //
  // Connect to the given URL.
  //
  primus.on('outgoing::open', function opening() {
    primus.emit('outgoing::end');

    //
    // FireFox will throw an error when we try to establish a connection from
    // a secure page to an unsecured WebSocket connection. This is inconsistent
    // behaviour between different browsers. This should ideally be solved in
    // Primus when we connect.
    //
    try {
      var prot = primus.url.protocol === 'ws+unix:' ? 'ws+unix' : 'ws'
        , qsa = prot === 'ws';

      //
      // Only allow primus.transport object in Node.js, it will throw in
      // browsers with a TypeError if we supply to much arguments.
      //
      if (Factory.length === 3) {
        primus.socket = socket = new Factory(
          primus.uri({ protocol: prot, query: qsa }),   // URL
          [],                                           // Sub protocols
          primus.transport                              // options.
        );
      } else {
        primus.socket = socket = new Factory(primus.uri({ protocol: prot, query: qsa }));
      }
    } catch (e) { return primus.emit('error', e); }

    //
    // Setup the Event handlers.
    //
    socket.binaryType = 'arraybuffer';
    socket.onopen = primus.emits('open');
    socket.onerror = primus.emits('error');
    socket.onclose = primus.emits('end');
    socket.onmessage = primus.emits('data', function parse(evt) {
      return evt.data;
    });
  });

  //
  // We need to write a new message to the socket.
  //
  primus.on('outgoing::data', function write(message) {
    if (!socket || socket.readyState !== Factory.OPEN) return;

    try { socket.send(message); }
    catch (e) { primus.emit('incoming::error', e); }
  });

  //
  // Attempt to reconnect the socket. It assumes that the `outgoing::end` event is
  // called if it failed to disconnect.
  //
  primus.on('outgoing::reconnect', function reconnect() {
    primus.emit('outgoing::end');
    primus.emit('outgoing::open');
  });

  //
  // We need to close the socket.
  //
  primus.on('outgoing::end', function close() {
    if (socket) {
      socket.onerror = socket.onopen = socket.onclose = socket.onmessage = function () {};
      socket.close();
      socket = null;
    }
  });
};
Primus.prototype.authorization = false;
Primus.prototype.pathname = "/primus";
Primus.prototype.encoder = function encoder(data, fn) {
  var err;

  try { data = JSON.stringify(data); }
  catch (e) { err = e; }

  fn(err, data);
};
Primus.prototype.decoder = function decoder(data, fn) {
  var err;

  if ('string' !== typeof data) return fn(err, data);

  try { data = JSON.parse(data); }
  catch (e) { err = e; }

  fn(err, data);
};
Primus.prototype.version = "2.3.0";

//
// Hack 1: \u2028 and \u2029 are allowed inside string in JSON. But JavaScript
// defines them as newline separators. Because no literal newlines are allowed
// in a string this causes a ParseError. We work around this issue by replacing
// these characters with a properly escaped version for those chars. This can
// cause errors with JSONP requests or if the string is just evaluated.
//
// This could have been solved by replacing the data during the "outgoing::data"
// event. But as it affects the JSON encoding in general I've opted for a global
// patch instead so all JSON.stringify operations are save.
//
if (
    'object' === typeof JSON
 && 'function' === typeof JSON.stringify
 && JSON.stringify(['\u2028\u2029']) === '["\u2028\u2029"]'
) {
  JSON.stringify = function replace(stringify) {
    var u2028 = /\u2028/g
      , u2029 = /\u2029/g;

    return function patched(value, replacer, spaces) {
      var result = stringify.call(this, value, replacer, spaces);

      //
      // Replace the bad chars.
      //
      if (result) {
        if (~result.indexOf('\u2028')) result = result.replace(u2028, '\\u2028');
        if (~result.indexOf('\u2029')) result = result.replace(u2029, '\\u2029');
      }

      return result;
    };
  }(JSON.stringify);
}

if (
     'undefined' !== typeof document
  && 'undefined' !== typeof navigator
) {
  //
  // Hack 2: If you press ESC in FireFox it will close all active connections.
  // Normally this makes sense, when your page is still loading. But versions
  // before FireFox 22 will close all connections including WebSocket connections
  // after page load. One way to prevent this is to do a `preventDefault()` and
  // cancel the operation before it bubbles up to the browsers default handler.
  // It needs to be added as `keydown` event, if it's added keyup it will not be
  // able to prevent the connection from being closed.
  //
  if (document.addEventListener) {
    document.addEventListener('keydown', function keydown(e) {
      if (e.keyCode !== 27 || !e.preventDefault) return;

      e.preventDefault();
    }, false);
  }

  //
  // Hack 3: This is a Mac/Apple bug only, when you're behind a reverse proxy or
  // have you network settings set to `automatic proxy discovery` the safari
  // browser will crash when the WebSocket constructor is initialised. There is
  // no way to detect the usage of these proxies available in JavaScript so we
  // need to do some nasty browser sniffing. This only affects Safari versions
  // lower then 5.1.4
  //
  var ua = (navigator.userAgent || '').toLowerCase()
    , parsed = ua.match(/.+(?:rv|it|ra|ie)[\/: ](\d+)\.(\d+)(?:\.(\d+))?/) || []
    , version = +[parsed[1], parsed[2]].join('.');

  if (
       !~ua.indexOf('chrome')
    && ~ua.indexOf('safari')
    && version < 534.54
  ) {
    Primus.prototype.AVOID_WEBSOCKETS = true;
  }
}
Primus.prototype.ark["callbacks"] = function (){}
 return Primus; });;(function (Primus, undefined) {
if (undefined === Primus) return;
//     uuid.js
//
//     Copyright (c) 2010-2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php

(function() {
  var _global = this;

  // Unique ID creation requires a high quality random # generator.  We feature
  // detect to determine the best RNG source, normalizing to a function that
  // returns 128-bits of randomness, since that's what's usually required
  var _rng;

  // Node.js crypto-based RNG - http://nodejs.org/docs/v0.6.2/api/crypto.html
  //
  // Moderately fast, high quality
  if (typeof(require) == 'function') {
    try {
      var _rb = require('crypto').randomBytes;
      _rng = _rb && function() {return _rb(16);};
    } catch(e) {}
  }

  if (!_rng && _global.crypto && crypto.getRandomValues) {
    // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
    //
    // Moderately fast, high quality
    var _rnds8 = new Uint8Array(16);
    _rng = function whatwgRNG() {
      crypto.getRandomValues(_rnds8);
      return _rnds8;
    };
  }

  if (!_rng) {
    // Math.random()-based (RNG)
    //
    // If all else fails, use Math.random().  It's fast, but is of unspecified
    // quality.
    var  _rnds = new Array(16);
    _rng = function() {
      for (var i = 0, r; i < 16; i++) {
        if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
        _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
      }

      return _rnds;
    };
  }

  // Buffer class to use
  var BufferClass = typeof(Buffer) == 'function' ? Buffer : Array;

  // Maps for number <-> hex string conversion
  var _byteToHex = [];
  var _hexToByte = {};
  for (var i = 0; i < 256; i++) {
    _byteToHex[i] = (i + 0x100).toString(16).substr(1);
    _hexToByte[_byteToHex[i]] = i;
  }

  // **`parse()` - Parse a UUID into it's component bytes**
  function parse(s, buf, offset) {
    var i = (buf && offset) || 0, ii = 0;

    buf = buf || [];
    s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
      if (ii < 16) { // Don't overflow!
        buf[i + ii++] = _hexToByte[oct];
      }
    });

    // Zero out remaining bytes if string was short
    while (ii < 16) {
      buf[i + ii++] = 0;
    }

    return buf;
  }

  // **`unparse()` - Convert UUID byte array (ala parse()) into a string**
  function unparse(buf, offset) {
    var i = offset || 0, bth = _byteToHex;
    return  bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]];
  }

  // **`v1()` - Generate time-based UUID**
  //
  // Inspired by https://github.com/LiosK/UUID.js
  // and http://docs.python.org/library/uuid.html

  // random #'s we need to init node and clockseq
  var _seedBytes = _rng();

  // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
  var _nodeId = [
    _seedBytes[0] | 0x01,
    _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
  ];

  // Per 4.2.2, randomize (14 bit) clockseq
  var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

  // Previous uuid creation time
  var _lastMSecs = 0, _lastNSecs = 0;

  // See https://github.com/broofa/node-uuid for API details
  function v1(options, buf, offset) {
    var i = buf && offset || 0;
    var b = buf || [];

    options = options || {};

    var clockseq = options.clockseq != null ? options.clockseq : _clockseq;

    // UUID timestamps are 100 nano-second units since the Gregorian epoch,
    // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
    // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
    // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
    var msecs = options.msecs != null ? options.msecs : new Date().getTime();

    // Per 4.2.1.2, use count of uuid's generated during the current clock
    // cycle to simulate higher resolution clock
    var nsecs = options.nsecs != null ? options.nsecs : _lastNSecs + 1;

    // Time since last uuid creation (in msecs)
    var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

    // Per 4.2.1.2, Bump clockseq on clock regression
    if (dt < 0 && options.clockseq == null) {
      clockseq = clockseq + 1 & 0x3fff;
    }

    // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
    // time interval
    if ((dt < 0 || msecs > _lastMSecs) && options.nsecs == null) {
      nsecs = 0;
    }

    // Per 4.2.1.2 Throw error if too many uuids are requested
    if (nsecs >= 10000) {
      throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
    }

    _lastMSecs = msecs;
    _lastNSecs = nsecs;
    _clockseq = clockseq;

    // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
    msecs += 12219292800000;

    // `time_low`
    var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
    b[i++] = tl >>> 24 & 0xff;
    b[i++] = tl >>> 16 & 0xff;
    b[i++] = tl >>> 8 & 0xff;
    b[i++] = tl & 0xff;

    // `time_mid`
    var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
    b[i++] = tmh >>> 8 & 0xff;
    b[i++] = tmh & 0xff;

    // `time_high_and_version`
    b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
    b[i++] = tmh >>> 16 & 0xff;

    // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
    b[i++] = clockseq >>> 8 | 0x80;

    // `clock_seq_low`
    b[i++] = clockseq & 0xff;

    // `node`
    var node = options.node || _nodeId;
    for (var n = 0; n < 6; n++) {
      b[i + n] = node[n];
    }

    return buf ? buf : unparse(b);
  }

  // **`v4()` - Generate random UUID**

  // See https://github.com/broofa/node-uuid for API details
  function v4(options, buf, offset) {
    // Deprecated - 'format' argument, as supported in v1.2
    var i = buf && offset || 0;

    if (typeof(options) == 'string') {
      buf = options == 'binary' ? new BufferClass(16) : null;
      options = null;
    }
    options = options || {};

    var rnds = options.random || (options.rng || _rng)();

    // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
    rnds[6] = (rnds[6] & 0x0f) | 0x40;
    rnds[8] = (rnds[8] & 0x3f) | 0x80;

    // Copy bytes to buffer, if provided
    if (buf) {
      for (var ii = 0; ii < 16; ii++) {
        buf[i + ii] = rnds[ii];
      }
    }

    return buf || unparse(rnds);
  }

  // Export public API
  var uuid = v4;
  uuid.v1 = v1;
  uuid.v4 = v4;
  uuid.parse = parse;
  uuid.unparse = unparse;
  uuid.BufferClass = BufferClass;

  if (typeof define === 'function' && define.amd) {
    // Publish as AMD module
    define(function() {return uuid;});
  } else if (typeof(module) != 'undefined' && module.exports) {
    // Publish as node.js module
    module.exports = uuid;
  } else {
    // Publish as global (in browsers)
    var _previousRoot = _global.uuid;

    // **`noConflict()` - (browser only) to reset global 'uuid' var**
    uuid.noConflict = function() {
      _global.uuid = _previousRoot;
      return uuid;
    };

    _global.uuid = uuid;
  }
}).call(this);

// enable errors to be sent using websockets
// http://stackoverflow.com/questions/18391212/is-it-not-possible-to-stringify-an-error-using-json-stringify
Object.defineProperty(Error.prototype, 'toJSON', {
  value: function () {
    var alt = {
      __isError: true
    };
    Object.getOwnPropertyNames(this).forEach(function (key) {
      alt[key] = this[key];
    }, this);

    return alt;
  },
  configurable: true
});

/**
 * Create a deep clone of the source restoring Error properties
 *
 * @param {Object} source Source object
 * @param {Object} dest Destination Object (only for recursive use)
 * @return {Object} Destination object or source if it is not an object
 */
function cloneWithSafeError(source, dest) {
  if (source && 'object' === typeof source) {
    dest = dest || {};
    var _source = source;
    if (!(dest instanceof Error) && source.hasOwnProperty('__isError')) {
      _source = cloneWithSafeError(source, new Error());
      return _source;
    }
    var key, value;
    for (key in _source) {
      if (_source.hasOwnProperty(key)) {
        if (key !== '__isError') {
          value = _source[key];
          try {
            if ( 'object' === typeof value) {
              dest[key] = cloneWithSafeError(value, dest[key]);
            } else {
              dest[key] = value;
            }
          } catch(e) {
            dest[key] = value;
          }
        }
      }
    }
  } else {
    dest = source;
  }
  return dest;
}

function responder() {
  var init = Primus.prototype.initialise
    , responseCallbacks = {}
    , requestTimeouts = {}
    , requestTimeout;

  /** PrivateFunction: requestFulfilled
   * A scoped version of `requestFulfilled` is passed along the "request" event
   * emitted by `dispatchRequest`.
   * The requestId available in the scope is used as responseId and is sent
   * along with the `data` argument.
   *
   * Parameters:
   *     (Error) err - The error if occurred
   *     (Object) data - Data to send with the response.
   */
  function requestFulfilled(err, data) {
    var filledData = {
      plugin: 'primus-callbacks'
        , responseId: this.requestId
        , data: data
    };
    if (err) {
      filledData.error = err;
    }
    this.primus.write(filledData);
  }

  /** PrivateFunction: dispatchRequest
   * Dispatches a request on a response. A "request" event is emitted by the
   * primus object. That event contains the request data and a scoped reference
   * on the `requestFulfilled` function. The subject which reacts on the event
   * calls `requestFulfilled` to send a response related to this request.
   *
   * Parameters:
   *     (String) requestId -  An ID which identifies the request to dispatch.
   *     (Object) data - The request data.
   *     (Error) err - The error if occurred
   */
  function dispatchRequest(requestId, data, err) {
    var scope = {
      primus: this
      , requestId: requestId
    };
    if (err) {
      scope.error = err;
    }
    var scopedRequestFulfilled = requestFulfilled.bind(scope);

    this.emit('request', data, scopedRequestFulfilled);
  }

  /** PrivateFunction: dispatchResponse
   * This dispatches a incoming response on a specific request. It expects a
   * `responseId` and searches a callback in the `responseCallbacks` object. If
   * present, it gets executed and the callback itself is deleted from
   * `responseCallbacks`.
   *
   * Parameters:
   *     (String) responseId - An ID which identifies a callback which should be
   *                           executed as soon as a response for a specific
   *                           request arrives.
   *     (Object) data - The response data transmitted by the server.
   *
   *     (Error) err - The error if occurred
   */
  function dispatchResponse(responseId, data, err) {
    var callback = responseCallbacks[responseId];

    if(callback) {
      delete responseCallbacks[responseId];
      data = cloneWithSafeError(data);
      err = cloneWithSafeError(err);
      callback(err, data);
    }
    if (requestTimeouts[responseId]) {
      clearInterval(requestTimeouts[responseId]);
      delete requestTimeouts[responseId];
    }

  }

  /** PrivateFunction: handleIncoming
   * A Primus transformer for incoming messages. As soon as a PrimusCallbacks
   * related envelope is detected, the contained data is dispatched using
   * `dispatchRequest` or `dispatchResponse`.
   *
   * Parameters:
   *     (Object) message - Incoming message
   */
  function handleIncoming(packet) {
    var proceed = true
      , data = packet.data;

    // Check if message contains PrimusCallbacks envelope
    if(data.plugin && data.plugin === 'primus-callbacks') {
      proceed = false;

      // Check if it is a request or a response and dispatch
      if(data.requestId) {
        dispatchRequest.call(this, data.requestId, data.data, data.error);
      } else if(data.responseId) {
        dispatchResponse.call(this, data.responseId, data.data, data.error);
      }
    }

    return proceed;
  }

  /** Function: initialise
   * Extending Primus initialisation code. Adds the `handleIncoming` transformer
   * to Primus' incoming transformer chain.
   */
  Primus.prototype.initialise = function() {
    this.transform('incoming', handleIncoming);
    init.apply(this, arguments);
    var opts = Array.prototype.slice.call(arguments)[0] || {};
    requestTimeout = opts.requestTimeout || opts.timeout || 10000;
  };

  /** Function: writeAndWait
   * Sends the passed data to the server. As soon as PrimusCallbacks recieved
   * a related response, `callback` is executed.
   *
   * Example:
   *
   *     primus.writeAndWait('PrimusCallbacks test', function(response) {
   *         console.log('PrimusCallbacks response arrived: ' + response);
   *     });
   *
   * Parameters:
   *     (Object) data - Data to send along the request
   *     (Function) callback - Executed as soon as the response on this request
   *                           arrived.
   */
  Primus.prototype.writeAndWait = function writeAndWait(data, callback) {
    var requestId = generateGUID()
      , envelope = {
        plugin: 'primus-callbacks'
        , requestId: requestId
        , data: data
      };

    responseCallbacks[requestId] = callback;
    this.write(envelope);

    function setRequestTimeout(requestId) {
      return setTimeout(function() {
        delete requestTimeouts[requestId];
        // execute the callback with error
        var callback = responseCallbacks[requestId];
        if (callback) {
          delete responseCallbacks[requestId];
          var err = new Error('timedout');
          err.timeout = requestTimeout;
          callback(err);
        }
        delete requestTimeouts[requestId];
      }, requestTimeout);
    }
    requestTimeouts[requestId] = setRequestTimeout(requestId);
  };

  /* jshint latedef: false */
  var generateGUID = function (){
    return uuid.v4();
  };
}
responder();
})(Primus);