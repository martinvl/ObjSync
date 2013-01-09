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

Inherits all methods of [KVCObject](https://github.com/martinvl/KVCObject). All
updates are automatically (and minimally) synced.
