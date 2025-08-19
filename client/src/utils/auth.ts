// Your shared secret (should be securely stored)
const encoder = new TextEncoder();
// Function to generate token
export async function generateToken(
  userId: string,
  sec_key: string,
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000); // seconds
  const payload = `${userId}|${timestamp}`;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(sec_key),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload),
    );
    // Step 2: Convert signature to hex
    const signatureHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Step 3: Encode payload and signature
    const payloadB64 = btoa(payload)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    return `${payloadB64}.${signatureHex}`;
  } catch (error) {
    console.error("Error generating token:", error);
    return "";
  }
}
