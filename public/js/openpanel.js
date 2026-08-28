// OpenPanel analytics bootstrap. Kept in an external file so it passes the
// strict `script-src 'self'` CSP without needing 'unsafe-inline' or a hash.
window.op = window.op || function () {
  var n = [];
  return new Proxy(function () { arguments.length && n.push([].slice.call(arguments)); }, {
    get: function (t, r) {
      return r === 'q' ? n : function () { n.push([r].concat([].slice.call(arguments))); };
    },
    has: function (t, r) { return r === 'q'; },
  });
}();

window.op('init', {
  apiUrl: 'http://opapi-c6nfemtl4rtqag63s0tfunl3.134.209.244.39.sslip.io',
  clientId: '01df3f13-f941-4496-9d8a-c1b500266cf0',
  trackScreenViews: true,
  trackOutgoingLinks: true,
  trackAttributes: true,
});
