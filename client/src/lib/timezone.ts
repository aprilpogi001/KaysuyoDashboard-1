const TIMEZONE = "Asia/Manila";

export function getPhilippineDateString(): string {
  const now = new Date();
  const phTime = new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
  const phYear = phTime.getFullYear();
  const phMonth = String(phTime.getMonth() + 1).padStart(2, '0');
  const phDay = String(phTime.getDate()).padStart(2, '0');
  return `${phYear}-${phMonth}-${phDay}`;
}

export function getPhilippineTime(): Date {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: TIMEZONE }));
}
