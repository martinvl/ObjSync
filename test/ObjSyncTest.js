var assert = require('chai').assert;
var io = require('socket.io');
var io_client = require('socket.io-client');
var ObjSync = require('../lib/ObjSync');

var PORT = 5555;

suite('ObjSync', function() {
    before(function () {
        this.server = io.listen(PORT).set('log level', 0);
    });


    suite('internals', function() {
        test('sets default options correctly', function () {
            var sync = new ObjSync(this.server.sockets);

            assert.equal(sync._options.subscribe, true);
            assert.equal(sync._options.publish, false);

            this.server.sockets.removeAllListeners();
            sync.removeAllListeners();
        });

        test('sets options correctly', function () {
            var sync = new ObjSync(this.server.sockets, {subscribe:false, publish:true});

            assert.equal(sync._options.subscribe, false);
            assert.equal(sync._options.publish, true);

            this.server.sockets.removeAllListeners();
            sync.removeAllListeners();
        });
    });

    suite('server side publish', function() {
        setup(function () {
            this.serverSide = new ObjSync(this.server.sockets, {publish:true, subscribe:false});
        });

        teardown(function () {
            this.server.sockets.removeAllListeners();
            this.serverSide.removeAllListeners();
        });

        test('emits base upon connection', function (done) {
            var obj = {foo:'obj'};
            this.serverSide.setObject(obj);

            var socket = io_client.connect('http://localhost', {port:PORT, 'force new connection':true});

            socket.on('create', function (base) {
                assert.deepEqual(base, obj);

                socket.removeAllListeners();
                socket.disconnect();

                done();
            });
        });

        test('emits updates', function (done) {
            var obj = {foo:'bar'};
            var socket = io_client.connect('http://localhost', {port:PORT, 'force new connection':true});

            var self = this;
            socket.on('connect', function () {
                self.serverSide.setObject(obj);
            });

            socket.on('update', function (payload) {
                assert.deepEqual(payload.updated, obj);

                socket.removeAllListeners();
                socket.disconnect();

                done();
            });
        });

        test('emits deletes', function (done) {
            this.serverSide.setObject({foo:'bar', man:{name:'johnny'}});
            var socket = io_client.connect('http://localhost', {port:PORT, 'force new connection':true});
            var obj = {foo:'bar'};

            var self = this;
            socket.on('connect', function () {
                self.serverSide.setObject(obj);
            });

            socket.on('update', function () {
                assert.deepEqual(self.serverSide.getObject(), obj);

                socket.removeAllListeners();
                socket.disconnect();

                done();
            });
        });
    });

    suite('client side publish', function() {
        test('emits base upon connection', function (done) {
            var socket = io_client.connect('http://localhost', {port:PORT, 'force new connection':true});
            var clientSide = new ObjSync(socket, {publish:true});

            this.server.sockets.once('connection', function (socket) {
                socket.on('create', function (base) {
                    assert.deepEqual(base, {});

                    socket.removeAllListeners();
                    socket.disconnect();

                    done()
                });
            });
        });

        test('emits updates', function (done) {
            var socket = io_client.connect('http://localhost', {port:PORT, 'force new connection':true});
            var clientSide = new ObjSync(socket, {publish:true});

            var obj = {foo:'bar'};

            this.server.sockets.once('connection', function (socket) {
                socket.on('create', function (base) {
                    clientSide.setObject(obj);
                });

                socket.on('update', function (payload) {
                    assert.deepEqual(payload.updated, obj);

                    socket.removeAllListeners();
                    socket.disconnect();

                    done()
                });
            });
        });

        test('emits deletes', function (done) {
            var socket = io_client.connect('http://localhost', {port:PORT, 'force new connection':true});
            var clientSide = new ObjSync(socket, {publish:true});

            clientSide.setObject({foo:'bar', man:{name:'johnny'}});

            var obj = {foo:'bar'};

            this.server.sockets.once('connection', function (socket) {
                socket.once('update', function (payload) {
                    clientSide.setObject(obj);

                    socket.on('update', function () {
                        assert.deepEqual(clientSide.getObject(), obj);

                        socket.removeAllListeners();
                        socket.disconnect();

                        done()
                    });
                });
            });
        });
    });

    suite('server side subscribe', function() {
        setup(function () {
            this.serverSide = new ObjSync(this.server.sockets);
        });

        teardown(function () {
            this.server.sockets.removeAllListeners();
            this.serverSide.removeAllListeners();
        });

        test('receives base upon connection', function (done) {
            var socket = io_client.connect('http://localhost', {port:PORT, 'force new connection':true});
            var clientSide = new ObjSync(socket, {publish:true});
            clientSide.setObject({foo:'bar'});

            var self = this;
            this.serverSide.on('update', function () {
                assert.deepEqual(self.serverSide.getObject(), clientSide.getObject());

                socket.removeAllListeners();
                socket.disconnect();

                done();
            });
        });

        test('receives updates', function (done) {
            var socket = io_client.connect('http://localhost', {port:PORT, 'force new connection':true});
            var clientSide = new ObjSync(socket, {publish:true});

            socket.on('connect', function () {
                clientSide.setObject({foo:'bar'});
            });

            var self = this;
            this.serverSide.on('update', function () {
                assert.deepEqual(self.serverSide.getObject(), clientSide.getObject());

                socket.removeAllListeners();
                socket.disconnect();

                done();
            });
        });

        test('receives deletes', function (done) {
            var socket = io_client.connect('http://localhost', {port:PORT, 'force new connection':true});
            var obj = {foo:'bar'};

            var clientSide = new ObjSync(socket, {publish:true});
            clientSide.setObject({foo:'bar', man:{name:'johnny'}});

            var self = this;
            this.serverSide.once('update', function (payload) {
                clientSide.setObject(obj);

                self.serverSide.once('update', function () {
                    assert.deepEqual(self.serverSide.getObject(), obj);

                    socket.removeAllListeners();
                    socket.disconnect();

                    done();
                });
            });
        });
    });

    suite('client side subscribe', function() {
        setup(function () {
            this.serverSide = new ObjSync(this.server.sockets, {publish:true});
        });

        teardown(function () {
            this.server.sockets.removeAllListeners();
            this.serverSide.removeAllListeners();
        });

        test('receives base upon connection', function (done) {
            var obj = {foo:'bar'};
            this.serverSide.setObject(obj);

            var socket = io_client.connect('http://localhost', {port:PORT, 'force new connection':true});
            var clientSide = new ObjSync(socket);

            clientSide.on('update', function (updated) {
                assert.deepEqual(updated, obj);
                assert.deepEqual(clientSide.getObject(), obj);

                socket.removeAllListeners();
                socket.disconnect();

                done();
            });
        });

        test('receives updates', function (done) {
            var obj = {foo:'bar'};

            var socket = io_client.connect('http://localhost', {port:PORT, 'force new connection':true});
            var clientSide = new ObjSync(socket);

            var self = this;
            socket.once('connect', function () {
                self.serverSide.setObject(obj);
            });

            clientSide.on('update', function (updated) {
                assert.deepEqual(updated, obj);
                assert.deepEqual(clientSide.getObject(), obj);

                socket.removeAllListeners();
                socket.disconnect();

                done();
            });
        });

        test('receives deletes', function (done) {
            this.serverSide.setObject({foo:'bar', man:{name:'johnny'}});
            var obj = {foo:'bar'};

            var socket = io_client.connect('http://localhost', {port:PORT, 'force new connection':true});
            var clientSide = new ObjSync(socket);

            var self = this;
            clientSide.once('update', function (updated) {
                self.serverSide.setObject(obj);

                clientSide.on('update', function (updated) {
                    assert.deepEqual(clientSide.getObject(), obj);

                    socket.removeAllListeners();
                    socket.disconnect();

                    done();
                });
            });
        });
    });
});
