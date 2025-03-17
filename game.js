const crypto = require("crypto");
const readline = require("readline");

class Dice {
  constructor(faces) {
    this.faces = faces;
  }

  roll() {
    return this.faces[Math.floor(Math.random() * this.faces.length)];
  }
}

class DiceParser {
  static parseDice(args) {
    if (args.length < 3) {
      console.log("Error: You must provide at least 3 dice.");
      console.log("Example: node game.js 2,2,4,4,9,9 6,8,1,1,8,6 7,5,3,7,5,3");
      process.exit(1);
    }

    return args.map((arg) => {
      const faces = arg.split(",").map((n) => parseInt(n.trim(), 10));
      if (faces.length !== 6 || faces.some(isNaN)) {
        console.log("Error: Each dice must have exactly 6 valid integers.");
        process.exit(1);
      }
      return new Dice(faces);
    });
  }
}

class HMACGenerator {
  static generateFairRandom(range) {
    const key = crypto.randomBytes(32).toString("hex");
    const randomNumber = crypto.randomInt(0, range);
    const hmac = crypto.createHmac("sha256", key).update(String(randomNumber)).digest("hex");
    return { key, randomNumber, hmac };
  }
}

class ProbabilityCalculator {
  static calculateWinProbability(diceA, diceB) {
    let winsA = 0, winsB = 0, draws = 0;
    for (let faceA of diceA.faces) {
      for (let faceB of diceB.faces) {
        if (faceA > faceB) winsA++;
        else if (faceA < faceB) winsB++;
        else draws++;
      }
    }

    const total = winsA + winsB + draws;
    return {
      winA: (winsA / total * 100).toFixed(2),
      winB: (winsB / total * 100).toFixed(2),
      draw: (draws / total * 100).toFixed(2),
    };
  }

  static displayProbabilityTable(dice) {
    console.log("\nProbability Table:");
    console.log("===================================");
    for (let i = 0; i < dice.length; i++) {
      for (let j = i + 1; j < dice.length; j++) {
        const { winA, winB, draw } = this.calculateWinProbability(dice[i], dice[j]);
        console.log(`Dice ${i + 1} vs Dice ${j + 1}: ${winA}% wins | ${winB}% losses | ${draw}% draws`);
      }
    }
    console.log("===================================\n");
  }
}

class Game {
  constructor(dice) {
    this.dice = dice;
    this.userDice = null;
    this.computerDice = null;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async determineFirstMove() {
    const { key, randomNumber, hmac } = HMACGenerator.generateFairRandom(2);
    console.log(`\nLet's determine who makes the first move.`);
    console.log(`HMAC: ${hmac}`);
    
    return new Promise((resolve) => {
      this.rl.question("Guess the number (0 or 1): ", (userGuess) => {
        if (userGuess !== "0" && userGuess !== "1") {
          console.log("Invalid input. Please enter 0 or 1.");
          process.exit(1);
        }
        
        console.log(`Computer's number: ${randomNumber} (KEY: ${key})`);
        const userWins = parseInt(userGuess) === randomNumber;
        resolve(userWins);
      });
    });
  }

  async chooseDice(isUserFirst) {
    console.log("\nAvailable dice:");
    this.dice.forEach((d, i) => console.log(`${i}: ${d.faces.join(",")}`));

    return new Promise((resolve) => {
      this.rl.question("Choose your dice (number): ", (choice) => {
        const index = parseInt(choice);
        if (isNaN(index) || index < 0 || index >= this.dice.length) {
          console.log("Invalid choice.");
          process.exit(1);
        }

        this.userDice = this.dice[index];
        this.computerDice = this.dice.find((_, i) => i !== index);
        console.log(`You chose: ${this.userDice.faces.join(",")}`);
        console.log(`Computer chose: ${this.computerDice.faces.join(",")}`);
        resolve();
      });
    });
  }

  async fairRoll(dice, player) {
    const { key, randomNumber, hmac } = HMACGenerator.generateFairRandom(6);
    console.log(`\n${player}, it's your turn to roll.`);
    console.log(`HMAC: ${hmac}`);

    return new Promise((resolve) => {
      this.rl.question("Enter a number (0-5): ", (userNumber) => {
        if (isNaN(userNumber) || userNumber < 0 || userNumber > 5) {
          console.log("Invalid input.");
          process.exit(1);
        }

        userNumber = parseInt(userNumber);
        console.log(`Computer's number: ${randomNumber} (KEY: ${key})`);
        const finalRoll = (randomNumber + userNumber) % 6;
        console.log(`${player} rolled: ${dice.faces[finalRoll]}`);
        resolve(dice.faces[finalRoll]);
      });
    });
  }

  async start() {
    const userFirst = await this.determineFirstMove();
    await this.chooseDice(userFirst);

    const userRoll = await this.fairRoll(this.userDice, "User");
    const computerRoll = await this.fairRoll(this.computerDice, "Computer");

    console.log("\nFinal Results:");
    console.log(`User rolled: ${userRoll}`);
    console.log(`Computer rolled: ${computerRoll}`);

    if (userRoll > computerRoll) console.log("You win!");
    else if (userRoll < computerRoll) console.log("Computer wins!");
    else console.log("It's a draw!");

    this.rl.close();
  }
}

// Run the game
const dice = DiceParser.parseDice(process.argv.slice(2));
const game = new Game(dice);
game.start();
