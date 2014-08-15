var dust = require('dust')();
var serand = require('serand');
var redirect = serand.redirect;

var user;

var domains;

dust.loadSource(dust.compile(require('./template'), 'hub-domains-main'));
dust.loadSource(dust.compile(require('./list'), 'hub-domains-list'));
dust.loadSource(dust.compile(require('./add'), 'hub-domains-add'));
dust.loadSource(dust.compile(require('./details'), 'hub-domains-details'));

var list = function (options, parent, done) {
    serand.once('hub', 'domains listed', function (data) {
        dust.render('hub-domains-list', data, function (err, out) {
            if (err) {
                done(err);
                return;
            }
            var el = $(out);
            $('.drones', el).on('click', function () {
                redirect('/domains/' + $(this).parent().data('id') + '/drones');
            });
            $('.details', el).on('click', function () {
                redirect('/domains/' + $(this).parent().data('id'));
            });
            $('.delete', el).on('click', function () {
                $.ajax({
                    method: 'DELETE',
                    url: '/apis/v/domains/' + $(this).parent().data('id'),
                    headers: {
                        'x-host': 'hub.serandives.com:4000'
                    },
                    dataType: 'json',
                    success: function (data) {
                        redirect('/domains');
                    },
                    error: function () {

                    }
                });
            });
            parent.html(el);
            done();
        });
    });
    serand.emit('hub', 'domains list');
};

var add = function (options, parent, done) {
    dust.render('hub-domains-add', options, function (err, out) {
        if (err) {
            done(err);
            return;
        }
        var el = $(out);
        $('.add', el).click(function () {
            $.ajax({
                method: 'POST',
                url: '/apis/v/domains',
                headers: {
                    'x-host': 'hub/serandives.com:4000'
                },
                data: {
                    name: $('.domain', el).val(),
                    repo: $('.repo', el).val()
                },
                dataType: 'json',
                success: function (data) {
                    console.log(data);
                    redirect('/domains');
                },
                error: function () {

                }
            });
            return false;
        });
        parent.html(el);
        done();
    });
};

var details = function (options, parent, done) {
    $.ajax({
        url: '/apis/v/domains/' + options.id,
        headers: {
            'x-host': 'hub.serandives.com:4000'
        },
        dataType: 'json',
        success: function (data) {
            dust.render('hub-domains-details', data, function (err, out) {
                if (err) {
                    done(err);
                    return;
                }
                var el = $(out);
                $.ajax({
                    url: '/apis/v/servers',
                    headers: {
                        'x-host': 'hub.serandives.com:4000'
                    },
                    dataType: 'json',
                    success: function (data) {
                        var html = '';
                        data.forEach(function (server) {
                            html += '<option value="' + server.id + '">' + server.ip + '</option>';
                        });
                        $('.servers', el).html(html);
                    },
                    error: function () {
                        done(true);
                    }
                });
                $('.add', el).click(function () {
                    var domain = $(this).data('domain');
                    var server = $('.servers', el).val();
                    console.log('emitting event : ' + server + ' ' + domain);
                    serand.emit('hub', 'drones start', {
                        server: server,
                        domain: domain
                    });
                    return false;
                });
                parent.html(el);
                done();
            });
        },
        error: function () {
            done(true);
        }
    });
};

var render = function (action, sandbox, fn, options, next) {
    dust.render('hub-domains-main', options, function (err, out) {
        if (err) {
            fn(err);
            return;
        }
        var el = $(out).appendTo(sandbox);
        $('.' + action, el).addClass('active');
        next(options, $('.content', el), function (err) {
            fn(err, function () {
                $('.hub-domains-main', sandbox).remove();
            });
        });
    });
};

var listMenu = [
    {
        title: 'Domains',
        url: '/domains',
        action: 'list'
    },
    {
        title: 'Add',
        url: '/domains/add',
        action: 'add'
    }
];

module.exports = function (sandbox, fn, options) {
    var action = options.action || 'list';
    switch (action) {
        case 'list':
            options.menu = listMenu;
            render('list', sandbox, fn, options, list);
            return;
        case 'add':
            options.menu = listMenu;
            render('add', sandbox, fn, options, add);
            return;
        case 'details':
            options.menu = [
                { title: 'Drones', url: '/domains/' + options.id + '/drones', action: 'drones'}
            ];
            render('details', sandbox, fn, options, details);
            return;
    }
};

var domain = function (id) {
    var d;
    domains.every(function (dom) {
        if (dom.id === id) {
            d = dom;
            return false;
        }
        return true;
    });
    return d;
};

serand.on('hub', 'domains list', function (id) {
    if (domains) {
        serand.emit('hub', 'domains listed', (id ? domain(id) : domains));
        return;
    }
    $.ajax({
        url: '/apis/v/domains',
        headers: {
            'x-host': 'hub.serandives.com:4000'
        },
        dataType: 'json',
        success: function (data) {
            domains = data;
            serand.emit('hub', 'domains listed', data);
        },
        error: function () {
            domains = [];
            serand.emit('hub', 'domains listed', []);
        }
    });
});
