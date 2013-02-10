var inherits = require('util').inherits;
var KVCObject = require('kvcobj');

var DEFAULT_OPTIONS = {
    subscribe:true,
    publish:false
};

function ObjSync(transport, options) {
    KVCObject.prototype.constructor.apply(this, [options]);

    this._transport = transport;

    this._setOptions(options, DEFAULT_OPTIONS);
    this._initialize();
}

inherits(ObjSync, KVCObject);
module.exports = ObjSync;

ObjSync.prototype._initialize = function () {
    this._justReceivedUpdate = false;

    if (this._options.publish) {
        this._setupPublish();
    }

    if (this._options.subscribe) {
        this._setupSubscription();

        var self = this;
        this._transport.on('connection', function (socket) {
            self._setupSubscription(socket);
        });
    }
};

ObjSync.prototype._setupPublish = function () {
    var self = this;

    this._transport.on('connection', function (socket) {
        self._publishBase(socket);
    });

    this._transport.on('connect', function () {
        self._publishBase(self._transport);
    });

    this.on('update', function (updated) {
        self._publishUpdate(updated);
    });
};

ObjSync.prototype._setupSubscription = function (transport) {
    transport = transport || this._transport;

    var self = this;
    transport.on('create', function (base) {
        self._receiveBase(base);
    });

    transport.on('update', function (payload) {
        self._receiveUpdate(payload);
    });
};

ObjSync.prototype._receiveUpdate = function (payload) {
    var updated = this._dismantlePayload(payload);

    for (var keypath in updated) {
        this.setValueForKeypath(updated[keypath], keypath, true);
    }

    if (this._hasChanges()) {
        this._justReceivedUpdate = true;
        this.commit();
    }
};

ObjSync.prototype._publishUpdate = function (updated) {
    if (!this._justReceivedUpdate) {
        var payload = this._assemblePayload(updated);

        if (this._objectSize(payload) > 0) {
            this._transport.emit('update', payload);
        }
    }

    this._justReceivedUpdate = false;
};

ObjSync.prototype._assemblePayload = function (updated) {
    var payload = {updated:{}, deleted:[]};

    // add updates ad deletes to payload
    for (var keypath in updated) {
        var value = updated[keypath];

        if (value !== undefined) {
            payload.updated[keypath] = value;
        } else {
            payload.deleted.push(keypath);
        }
    }

    // trim payload so it contains only necessary data
    if (this._objectSize(payload.updated) == 0) {
        delete payload.updated;
    }

    if (payload.deleted.length == 0) {
        delete payload.deleted;
    }

    return payload;
};

ObjSync.prototype._dismantlePayload = function (payload) {
    var updated = {};

    if (payload.updated !== undefined) {
        for (var keypath in payload.updated) {
            updated[keypath] = payload.updated[keypath];
        }
    }

    if (payload.deleted !== undefined) {
        for (var idx in payload.deleted) {
            var keypath = payload.deleted[idx];

            updated[keypath] = undefined;
        }
    }

    return updated;
};

ObjSync.prototype._publishBase = function (transport) {
    transport.emit('create', this.getObject());
};

ObjSync.prototype._receiveBase = function (base) {
    this.setObject(base, true);

    if (this._hasChanges()) {
        this._justReceivedUpdate = true;
        this.commit();
    }
};
