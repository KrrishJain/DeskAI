import bcrypt from "bcrypt";

const hash = "$2b$12$L5OZQPTK56HtT48QQdGCVulzJXm.d9br4r4VJyPVvCumEMN80dh1e";
const password = "test123";

async function checkPassword() {
  const match = await bcrypt.compare(password, hash);
  console.log(match); // true or false
}

checkPassword();