import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import mongoose from 'mongoose';

// Load .env from root without requiring external dotenv package
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  }
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/teledrive';

// Inline schema definition to allow standalone execution without compiling backend
const AllowedDiscordUserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    discordId: { type: String, sparse: true, trim: true },
    addedBy: { type: String, default: 'cli', trim: true },
    addedAt: { type: Date, default: Date.now },
    notes: { type: String, trim: true },
  },
  { collection: 'allowed_discord_users', timestamps: true }
);

const AllowedDiscordUser =
  mongoose.models.AllowedDiscordUser ||
  mongoose.model('AllowedDiscordUser', AllowedDiscordUserSchema);

function getEnvAllowed(): string[] {
  const raw = process.env.ALLOWED_DISCORD_USERNAMES || '';
  if (!raw.trim()) return [];
  return raw
    .split(',')
    .map(s => s.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
}

function promptQuestion(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (answer) => resolve(answer.trim()));
  });
}

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
  } catch (err: any) {
    console.error(`\x1b[31m[Error] Failed connecting to MongoDB:\x1b[0m ${err.message}`);
    process.exit(1);
  }
}

async function listUsers(): Promise<{ dbUsers: any[]; envUsers: string[] }> {
  const dbUsers = await AllowedDiscordUser.find().sort({ username: 1 });
  const envUsers = getEnvAllowed();

  console.log(`\n\x1b[1m\x1b[36m=== Allowed Discord Usernames ===\x1b[0m`);
  console.log(`Total Allowed: \x1b[1m${dbUsers.length + envUsers.length}\x1b[0m\n`);

  if (envUsers.length > 0) {
    console.log(`\x1b[33mFrom Environment Variable (ALLOWED_DISCORD_USERNAMES):\x1b[0m`);
    envUsers.forEach((u, i) => {
      console.log(`  [E${i + 1}] \x1b[32m@${u}\x1b[0m (source: .env)`);
    });
    console.log('');
  }

  if (dbUsers.length > 0) {
    console.log(`\x1b[34mFrom Database (MongoDB allowed_discord_users):\x1b[0m`);
    console.log(
      '  #   ' +
        'Username'.padEnd(24) +
        'Added By'.padEnd(16) +
        'Added At'.padEnd(20) +
        'Notes'
    );
    console.log('  ' + '-'.repeat(74));
    dbUsers.forEach((u, idx) => {
      const numStr = `[${idx + 1}]`.padEnd(6);
      const dateStr = u.addedAt
        ? new Date(u.addedAt).toISOString().split('T')[0]
        : '-';
      console.log(
        '  ' +
          numStr +
          `\x1b[32m@${u.username}\x1b[0m`.padEnd(33) +
          (u.addedBy || 'cli').padEnd(16) +
          dateStr.padEnd(20) +
          (u.notes || '-')
      );
    });
  } else if (envUsers.length === 0) {
    console.log(`\x1b[33mNo Discord users are currently allowed. All Discord logins will be rejected!\x1b[0m`);
  }
  console.log('');
  return { dbUsers, envUsers };
}

async function addUser(rawUsername: string, notes?: string) {
  const target = (rawUsername || '').trim().toLowerCase().replace(/^@/, '');
  if (!target) {
    console.log(`\x1b[31m[Error] Username cannot be empty.\x1b[0m`);
    return;
  }

  const existing = await AllowedDiscordUser.findOne({ username: target });
  if (existing) {
    if (notes) existing.notes = notes;
    await existing.save();
    console.log(`\x1b[33m[Updated]\x1b[0m Discord user \x1b[32m@${target}\x1b[0m was already allowed. Record updated.`);
  } else {
    await AllowedDiscordUser.create({
      username: target,
      addedBy: 'cli',
      notes,
      addedAt: new Date(),
    });
    console.log(`\x1b[32m[Success]\x1b[0m Allowed Discord user \x1b[1m\x1b[32m@${target}\x1b[0m. They can now log in!`);
  }
}

async function removeUser(target: string) {
  const username = (target || '').trim().toLowerCase().replace(/^@/, '');
  if (!username) {
    console.log(`\x1b[31m[Error] Please specify a username or number to remove.\x1b[0m`);
    return;
  }

  const result = await AllowedDiscordUser.deleteOne({ username });
  const envUsers = getEnvAllowed();

  if (result.deletedCount > 0) {
    console.log(`\x1b[32m[Success]\x1b[0m Removed Discord user \x1b[31m@${username}\x1b[0m from database allowlist.`);
  } else {
    console.log(`\x1b[33m[Notice]\x1b[0m Discord user \x1b[31m@${username}\x1b[0m was not found in the database.`);
  }

  if (envUsers.includes(username)) {
    console.log(
      `\x1b[33m[Warning]\x1b[0m User \x1b[31m@${username}\x1b[0m is also configured in ALLOWED_DISCORD_USERNAMES in .env. Remove it from .env to permanently block.`
    );
  }
}

async function interactiveMenu() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    let running = true;
    while (running) {
      console.log(`\x1b[1m\x1b[35m=== TeleDrive Discord Access Control ===\x1b[0m`);
      console.log(`  \x1b[36m[1]\x1b[0m See all allowed usernames`);
      console.log(`  \x1b[36m[2]\x1b[0m Add allowed username`);
      console.log(`  \x1b[36m[3]\x1b[0m Remove allowed username (by number or name)`);
      console.log(`  \x1b[36m[4]\x1b[0m Check if a username is allowed`);
      console.log(`  \x1b[36m[5]\x1b[0m Exit\n`);

      const choice = await promptQuestion(rl, 'Select an option [1-5]: ');

      switch (choice.trim()) {
        case '1': {
          await listUsers();
          break;
        }

        case '2': {
          const u = await promptQuestion(rl, 'Enter Discord username to allow: ');
          if (u) {
            const note = await promptQuestion(rl, 'Optional note/description (press Enter to skip): ');
            await addUser(u, note || undefined);
          }
          break;
        }

        case '3': {
          const { dbUsers } = await listUsers();
          if (dbUsers.length === 0) {
            console.log(`No database users to remove.\n`);
            break;
          }

          const input = await promptQuestion(
            rl,
            'Enter the number [#] or the username to remove: '
          );

          if (!input) break;

          const num = parseInt(input, 10);
          if (!isNaN(num) && num >= 1 && num <= dbUsers.length) {
            const selectedUser = dbUsers[num - 1].username;
            await removeUser(selectedUser);
          } else {
            await removeUser(input);
          }
          break;
        }

        case '4': {
          const checkUser = await promptQuestion(rl, 'Enter Discord username to check: ');
          if (checkUser) {
            const target = checkUser.trim().toLowerCase().replace(/^@/, '');
            const envUsers = getEnvAllowed();
            const inEnv = envUsers.includes(target);
            const inDB = await AllowedDiscordUser.findOne({ username: target });
            if (inEnv || inDB) {
              console.log(`\x1b[32m[ALLOWED]\x1b[0m @${target} can log in (${inDB ? 'database' : ''}${inDB && inEnv ? ' + ' : ''}${inEnv ? 'env' : ''}).\n`);
            } else {
              console.log(`\x1b[31m[REJECTED]\x1b[0m @${target} is NOT allowed. Login will be denied.\n`);
            }
          }
          break;
        }

        case '5':
        case 'q':
        case 'exit': {
          console.log(`Goodbye!`);
          running = false;
          break;
        }

        default: {
          console.log(`\x1b[33mInvalid option. Please enter 1, 2, 3, 4, or 5.\x1b[0m\n`);
          break;
        }
      }
    }
  } finally {
    rl.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = (args[0] || '').toLowerCase();
  const targetUsername = (args[1] || '').trim().toLowerCase().replace(/^@/, '');
  const notes = args.slice(2).join(' ').trim() || undefined;

  await connectDB();

  try {
    // If no argument or "menu" or numeric argument, run interactive menu
    if (!command || command === 'menu' || ['1', '2', '3', '4', '5'].includes(command)) {
      if (['1', '2', '3', '4', '5'].includes(command)) {
        if (command === '1') {
          await listUsers();
        } else if (command === '2' && targetUsername) {
          await addUser(targetUsername, notes);
        } else if (command === '3' && targetUsername) {
          await removeUser(targetUsername);
        } else {
          await interactiveMenu();
        }
      } else {
        await interactiveMenu();
      }
      return;
    }

    // Direct CLI arguments support:
    switch (command) {
      case 'list':
      case 'see': {
        await listUsers();
        break;
      }
      case 'add':
      case 'allow': {
        await addUser(targetUsername, notes);
        break;
      }
      case 'remove':
      case 'delete':
      case 'revoke': {
        await removeUser(targetUsername);
        break;
      }
      case 'check': {
        const envUsers = getEnvAllowed();
        const inEnv = envUsers.includes(targetUsername);
        const inDB = await AllowedDiscordUser.findOne({ username: targetUsername });
        if (inEnv || inDB) {
          console.log(`\x1b[32m[ALLOWED]\x1b[0m @${targetUsername} is authorized.`);
        } else {
          console.log(`\x1b[31m[REJECTED]\x1b[0m @${targetUsername} is NOT authorized.`);
        }
        break;
      }
      default: {
        console.log(`Unknown command: "${command}". Running interactive menu...`);
        await interactiveMenu();
        break;
      }
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('\x1b[31m[Fatal Error]\x1b[0m', err);
  process.exit(1);
});
