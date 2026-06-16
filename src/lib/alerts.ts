export function canOperatorAckAlert(status: string | undefined): boolean {
  const s = (status ?? "").toUpperCase();
  if (s.includes("CLOSED") || s.includes("CLOSE")) return false;
  if (s.includes("ACK")) return false;
  return true;
}
