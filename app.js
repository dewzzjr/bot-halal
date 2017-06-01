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

// Create query for daftarMakanan
var query_makan = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX halalv: <http://halalfood.ga/halalv.ttl#>
SELECT ?food
WHERE {
  ?a rdf:type halalv:FoodProduct.
  ?a rdfs:label ?food
}`;


// Listen for messages from users
server.post('/api/messages', connector.listen());

// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
//var bot = new builder.UniversalBot(connector, function (session) {
//    session.send("You said: %s", session.message.text);
//});

// Create your bot with a function to receive messages from the user
// Create bot and default message handler
var bot = new builder.UniversalBot(connector, function (session) {
    session.send("Halo.. Kami menyediakan data makanan halal. Tuliskan 'daftar makanan' untuk melihat daftar makanan kami.");
});

// Add dialog to return list of shirts available
bot.dialog('daftarMakanan', function (session) {
    client.query(query_makan, function(err, res) {
        var attachments = new Array();
        var result = res.results.bindings;

        var jumlah = 5;
        var buttons;
        var i;
        console.log("length :" + result.length);
        // Create cards
        for (i = 0; i < (result.length / jumlah) - 1; i++) {
          buttons = new Array();
          for (var j = 0; j < 5; j++) {
            var index = i * jumlah + j;
            console.log(index + ":" + JSON.stringify(result[index].food));
            buttons.push(builder.CardAction.imBack(session, "bahan " + result[index].food.value, result[index].food.value));
          }
          attachments.push(
            new builder.HeroCard(session)
              .title("Halal Food " + i)
              .subtitle("Menampilkan daftar Makanan Halal yang kami miliki")
              .images([builder.CardImage.create(session, 'http://halal.wg.ugm.ac.id/foto_berita/halal.jpg')])
              .buttons(buttons)
            );
            console.log("OK "+ i);
        };
        // Create last card
        buttons = new Array();
        var mod = result.length - (result.length % jumlah);
        console.log(mod+ " " +result.length % jumlah);
        for (var j = mod; j < result.length % jumlah; j++) {
          var index = ((result.length / jumlah) * jumlah) + j;
          console.log(index + ":" + JSON.stringify(result[index].food));
          buttons.push(builder.CardAction.imBack(session, "bahan " + result[index].food.value, result[index].food.value));
        }
        attachments.push(
          new builder.HeroCard(session)
            .title("Halal Food " + i)
            .subtitle("Menampilkan daftar Makanan Halal yang kami miliki")
            .images([builder.CardImage.create(session, 'http://halal.wg.ugm.ac.id/foto_berita/halal.jpg')])
            .buttons(buttons)
          );
        //Create Message
        var msg = new builder.Message(session);
        msg.attachmentLayout(builder.AttachmentLayout.carousel)
        msg.attachments(attachments);//[
//            new builder.HeroCard(session)
//                .title("Halal Food")
//                .subtitle("Menampilkan daftar Makanan Halal yang kami miliki")
//                .images([builder.CardImage.create(session, 'http://halal.wg.ugm.ac.id/foto_berita/halal.jpg')])
//                .buttons(buttons)
//        ]);
        session.send(msg).endDialog();
    })
}).triggerAction({ matches: /^(daftar|tampilkan)/i });
