// Print the SQL that resets the WrL admin password, for pasting into the Neon
// SQL Editor. Used when the production DATABASE_URL is a Vercel "Sensitive"
// variable and cannot be pulled to this machine.
//
//   node scripts/admin-reset-sql.mjs
//
// The password is typed at a prompt (not passed as an argument) so it never
// lands in shell history; only its bcrypt hash is printed.

import readline from "node:readline";

import bcrypt from "bcryptjs";

// One interface, read through its async iterator: that buffers lines, so a
// pasted "password<Enter>password<Enter>" is not lost between the prompts.
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl._writeToOutput = () => {}; // echo nothing while the password is typed
const lines = rl[Symbol.asyncIterator]();

async function ask(question) {
  process.stdout.write(question);
  const { value } = await lines.next();
  process.stdout.write("\n");
  return (value ?? "").trim();
}

const password = await ask("Mật khẩu admin mới (tối thiểu 12 ký tự): ");
if (password.length < 12) {
  console.error("Mật khẩu quá ngắn — cần ít nhất 12 ký tự.");
  process.exit(1);
}
const confirm = await ask("Nhập lại mật khẩu: ");
rl.close();
if (confirm !== password) {
  console.error("Hai lần nhập không khớp.");
  process.exit(1);
}

// Same cost factor the app uses in src/lib/auth.ts.
const hash = await bcrypt.hash(password, 10);

console.log(`
-- 1) Xem tài khoản admin hiện có (email dùng để đăng nhập):
SELECT id, email, status FROM "User" WHERE role = 'ADMIN';

-- 2) Đặt lại mật khẩu cho MỌI tài khoản ADMIN và mở khoá nếu đang bị khoá:
UPDATE "User"
SET "passwordHash" = '${hash}', status = 'ACTIVE'
WHERE role = 'ADMIN';
`);
