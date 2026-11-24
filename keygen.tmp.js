// ملف مؤقت لتوليد مفتاح توقيع أندرويد (PKCS#12) في المتصفح فقط.
// لا يحتوي على أي سر، ويُحذف فور توليد المفتاح وحفظه كأسرار GitHub.
// يُشغَّل عبر JSFiddle بجلب هذا الملف وتنفيذه محلياً؛ المفتاح لا يغادر المتصفح.
(function () {
  function show(t) {
    document.body.innerHTML = '<pre id="out"></pre>';
    document.getElementById('out').textContent = t;
  }
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/node-forge@1.3.1/dist/forge.min.js';
  s.onload = function () {
    try {
      var f = forge;
      var raw = new Uint8Array(24);
      crypto.getRandomValues(raw);
      var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
      var pw = '';
      for (var i = 0; i < 24; i++) pw += chars[raw[i] % chars.length];
      var keys = f.pki.rsa.generateKeyPair(2048);
      var cert = f.pki.createCertificate();
      cert.publicKey = keys.publicKey;
      cert.serialNumber = '01';
      cert.validity.notBefore = new Date();
      cert.validity.notAfter = new Date(Date.now() + 25 * 365 * 24 * 60 * 60 * 1000);
      var attrs = [
        { name: 'commonName', value: 'Abu Jrin Market' },
        { name: 'organizationName', value: 'Abu Jrin Market' },
        { name: 'countryName', value: 'SY' }
      ];
      cert.setSubject(attrs);
      cert.setIssuer(attrs);
      cert.sign(keys.privateKey, f.md.sha256.create());
      var p12Asn1 = f.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], pw, { algorithm: 'aes256', friendlyName: 'abujrin' });
      var b64 = f.util.encode64(f.asn1.toDer(p12Asn1).getBytes());
      var p12 = f.pkcs12.pkcs12FromAsn1(f.asn1.fromDer(f.util.decode64(b64)), pw);
      var bags = p12.getBags({ bagType: f.pki.oids.pkcs8ShroudedKeyBag });
      var bag = bags[f.pki.oids.pkcs8ShroudedKeyBag][0];
      var out = 'ALIAS=' + JSON.stringify(bag.attributes.friendlyName) + '\n';
      out += 'ATTRS=' + JSON.stringify(bag.attributes) + '\n';
      out += 'PASSWORD=' + pw + '\n';
      out += 'B64LEN=' + b64.length + '\n';
      for (var j = 0; j < b64.length; j += 400) {
        out += 'B64_' + (j / 400 + 1) + '=' + b64.slice(j, j + 400) + '\n';
      }
      out += 'DONE\n';
      show(out);
    } catch (e) {
      show('ERROR: ' + (e && e.message ? e.message : e));
    }
  };
  s.onerror = function () { show('ERROR: could not load node-forge'); };
  document.head.appendChild(s);
})();
