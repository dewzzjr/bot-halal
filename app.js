var restify = require('restify');
var builder = require('botbuilder');
var sparql = require('sparql')
var client = new sparql.Client('http://pesantren.santri.me:3030/ds/sparql')

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: 'bdd1b69e-24a8-4a2e-855e-3854697c0760',
    appPassword: '3ugBuR3ZG6SRD5EE1StErzZ'
});



// Listen for messages from users
server.post('/api/messages', connector.listen());

// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
//var bot = new builder.UniversalBot(connector, function (session) {
//    session.send("You said: %s", session.message.text);
//});

// Create your bot with a function to receive messages from the user
// Create bot and default message handler
var bot = new builder.UniversalBot(connector, function (session) {
    session.send(`Halo.. Kami menyediakan data makanan halal.
    \nSilahkan tuliskan perintah berikut
    \n**cari KATA_KUNCI_PRODUK** untuk melihat daftar makanan kami
    \n**bahan NAMA_PRODUK** untuk melihat komposisi bahan produk
    \n**kadaluarsa NAMA_PRODUK** untuk mencari tanggal kadaluarsa produk`);
});

// Add dialog to return list of shirts available
bot.dialog('kadaluarsa', function (session) {
  session.sendTyping();
  var makanan = session.message.text.substr(11);
  var query_kadaluarsa = `
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
  PREFIX halalv: <http://halalfood.ga/halalv.ttl#>
  SELECT ?produk ?exp
  WHERE {
    ?a a halalv:FoodProduct.
    ?a rdfs:label ?produk.
    FILTER(REGEX (?produk, "`+makanan+`", "i")).
    ?a halalv:certificate ?b.
    ?b halalv:halalExp ?exp
  } ORDER BY (?exp) LIMIT 10`;
  client.query(query_kadaluarsa, function(err, res) {
      var result = res.results.bindings;
      for (var i = 0; i < result.length; i++) {
        var exp = new Date(result[i].exp.value);
        var now = Date.now();
        var date = exp.toLocaleDateString("id");
        session.send("Sertifikat **"+ result[i].produk.value +"** kadaluarsa pada tanggal **"+ date +"**");
      }
      session.endDialog();
  });
  }
).triggerAction({ matches: /^(kadaluarsa)/i });

// Add dialog to return list of shirts available
bot.dialog('bahanMakanan', function (session) {
  session.sendTyping();
  var makanan = session.message.text.substr(6);
  var query_bahan = `
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
  PREFIX halalv: <http://halalfood.ga/halalv.ttl#>
  SELECT ?nama ?bahan ?pabrik
  WHERE {
    ?a rdf:type halalv:FoodProduct.
    ?a rdfs:label ?nama.
    FILTER(REGEX (?nama, "`+makanan+`", "i")).
    ?a halalv:manufacture ?p.
    ?p rdfs:label ?pabrik.
    ?a halalv:containsIngredient ?b.
    ?b rdfs:label ?bahan
  } ORDER BY (?nama) LIMIT 5`;
  client.query(query_bahan, function(err, res) {
      var result = res.results.bindings;
      var produk = new Array();
      var index = 0;
      for (var i = 0; i < result.length; i++) {
        var ada = false;
        for (var j = 0; j < produk.length; j++ ) {
          index = j;
          if(result[i].nama.value === produk[index].nama) {
            ada = true;
            break;
          } else {
            index = produk.length;
          }
        }
        if(ada === false) {
          produk.push({"nama": result[i].nama.value, "pabrik": result[i].pabrik.value, "bahan": []});
        }
        //produk[index].nama = result[i].nama;
        produk[index].bahan.push(result[i].bahan.value);
      }
      console.log(produk);
      for (var i = 0; i < produk.length; i++){
        var bahan = produk[i].bahan;
        var items = new Array();
        var text = "Terdiri dari bahan berikut:"
        for(var j = 0; j < bahan.length; j++) {
          text +=  "\n-" + bahan[j];
        }
        var msg = new builder.Message(session).addAttachment(
          new builder.HeroCard(session)
            .title(produk[i].nama)
            .subtitle('Diproduksi oleh: '+ produk[i].pabrik )
            .text(text)
          );
        session.send(msg);
      }
      session.endDialog();
  });
  }
).triggerAction({ matches: /^(bahan)/i });

// Add dialog to return list of shirts available
bot.dialog('daftarMakanan', function (session) {
  session.sendTyping();
  var makanan = session.message.text.substr(5);
  var query_daftar = `
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
  PREFIX halalv: <http://halalfood.ga/halalv.ttl#>
  SELECT ?food
  WHERE {
    ?a rdf:type halalv:FoodProduct.
    ?a rdfs:label ?food.
    FILTER(REGEX (?food, "`+makanan+`", "i")).
  } ORDER BY (?food)`;
    client.query(query_daftar, function(err, res) {
        var result = res.results.bindings;
        var buttons = new Array();
        // Create cards
        for (var index = 0; index < result.length; index++ ) {
          buttons.push(builder.CardAction.imBack(session, "bahan " + result[index].food.value, result[index].food.value));
        }
        //Create Message
        var msg = new builder.Message(session)
          .text("Menampilkan daftar Makanan Halal yang kami miliki")
          .suggestedActions(
            builder.SuggestedActions.create(
              session, buttons
          ));
        session.send(msg).endDialog();

        /*
          var attachments = new Array();
          var result = res.results.bindings;

          var buttons = new Array();
          // Create cards
            for (var index = 0; index < result.length; index++ ) {
              buttons.push(builder.CardAction.imBack(session, "bahan " + result[index].food.value, result[index].food.value));
            }
            attachments.push(
              new builder.HeroCard(session)
                .title("Halal Food")
                .subtitle("Menampilkan daftar Makanan Halal yang kami miliki")
                //.images([builder.CardImage.create(session, 'http://halal.wg.ugm.ac.id/foto_berita/halal.jpg')])
                .buttons(buttons)
              );
          //Create Message
          var msg = new builder.Message(session);
          msg.attachmentLayout(builder.AttachmentLayout.carousel)
          msg.attachments(attachments);//[
              new builder.HeroCard(session)
                  .title("Halal Food")
                  .subtitle("Menampilkan daftar Makanan Halal yang kami miliki")
                  .images([builder.CardImage.create(session, 'http://halal.wg.ugm.ac.id/foto_berita/halal.jpg')])
                  .buttons(buttons)
          ]);
          session.send(msg).endDialog();
          */
    })
}).triggerAction({ matches: /^(cari)/i });
