var restore = require('mongodb-restore');
var devUri = `mongodb://localhost:27017/in-and-out`;

restore({
    uri: devUri,
    root: __dirname + '/fb2b86b1ef42eee47e65ce27fc320948'
});
