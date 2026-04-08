const bcrypt = require('bcryptjs');

bcrypt.hash('admin456', 10).then(h => {
  console.log("HASH:", h);
});