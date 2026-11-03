export type FieldErrors = Record<string, string>;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateSignup(input: {
  name: string;
  email: string;
  password: string;
  inviteCode: string;
}): { ok: true; data: { name: string; email: string; password: string; inviteCode: string } } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const password = input.password;
  const inviteCode = input.inviteCode.trim().toUpperCase();

  if (name.length < 2) errors.name = "Вкажи імʼя (мінімум 2 символи).";
  if (name.length > 80) errors.name = "Імʼя задовге.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Некоректний email.";
  }
  if (password.length < 8) {
    errors.password = "Пароль має мати щонайменше 8 символів.";
  }
  if (password.length > 200) errors.password = "Пароль задовгий.";
  if (!inviteCode) errors.inviteCode = "Вкажи код запрошення групи.";

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { name, email, password, inviteCode } };
}

export function validateLogin(input: {
  email: string;
  password: string;
}): { ok: true; data: { email: string; password: string } } | { ok: false; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const email = normalizeEmail(input.email);
  const password = input.password;
  if (!email) errors.email = "Вкажи email.";
  if (!password) errors.password = "Вкажи пароль.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { email, password } };
}
