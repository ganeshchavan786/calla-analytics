const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

function decrypt(encryptedText) {
  if (!encryptedText) return "";
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 3) return encryptedText;

    const [ivHex, authTagHex, encrypted] = parts;
    
    const secret =
      process.env.NEXTAUTH_SECRET ||
      process.env.JWT_SECRET ||
      process.env.APP_SECRET ||
      "calllog-saas-default-encryption-key-2024";

    const key = crypto.createHash("sha256").update(secret).digest();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (e) {
    return "[DECRYPTION FAILED]: " + e.message;
  }
}

async function main() {
  const license = await prisma.licenseSettings.findFirst({
    where: { isActive: true },
  });

  if (!license) {
    console.log("No active LicenseSettings record found!");
    return;
  }

  console.log("License Settings Found:");
  console.log("paymentEnabled:", license.paymentEnabled);
  console.log("paymentMode:", license.paymentMode);
  console.log("razorpayKeyId:", license.razorpayKeyId);
  console.log("razorpayKeySecret raw:", license.razorpayKeySecret);
  
  if (license.razorpayKeySecret) {
    const decrypted = decrypt(license.razorpayKeySecret);
    console.log("decrypted secret:", decrypted);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
