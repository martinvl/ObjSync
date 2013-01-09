var inherits = require('util').inherits;
var KVCObject = require('KVCObject');

function ObjSync(transport, options) {
    KVCObject.prototype.constructor.apply(this, [options]);

    this._transport = transport;
    this._initialize();
}

inherits(ObjSync, KVCObject);
module.exports = ObjSync;

ObjSync.prototype._initialize = function () {
    this._justReceivedUpdate = false;

    // handle incomming updates
    var self = this;

    this._transport.on('update', function (payload) {
        self._receiveUpdate(payload);
    });

    this.on('update', function (updated) {
        self._sendUpdate(updated);
    });
};

ObjSync.prototype._receiveUpdate = function (payload) {
    var updated = this._dismantlePayload(payload);

    for (var keypath in updated) {
        this.setValueForKeypath(updated[keypath], keypath, true);
    }

    if (this._hasChanges()) {
        this._justReceivedUpdate = true;
        this._emitChanges();
    }
};

ObjSync.prototype._sendUpdate = function (updated) {
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
}

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
