ObjSync
=========

Synchronizes objects between clients via [Socket.IO](http://socket.io) socket-like transports.

Public API
==========
Methods
-------
* **(constructor)**(< _Socket.IO socket-like_ >transport, [< _object_ >options])  
    Creates and returns a new ObjSync object, which communicates via `transport`.  
    Valid options:
    * **delimiter** - _string_ - The string to use as delimiter between keys.
    **Default:** '.'
    * **subscribe** - _bool_ - Whether the syncer should subscribe to incomming
    updates. If set to `false`, no incomming updates will be accepted.
    **Default:** 'true'
    * **publish** - _bool_ - Sets whether the syncer should publish updates. If
    set to `false`, no updates will be sent.
    **Default:** 'false'
    **Note:** Two-way syncing can only be done if both sides have equal objects
    at the time that the connection is made!

Inherits all methods of [KVCObject](https://github.com/martinvl/KVCObject). All
updates are automatically (and minimally) synced.
