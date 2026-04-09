import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../src/app.js";

// vitest "fakes" the SMTP service so the code doesn't
// actually talk to Google during tests
vi.mock("../src/services/smtpService.js", () => ({
  getMxRecords: vi.fn().mockResolvedValue([]), // pretend no MX records found
  checkMailbox: vi.fn(),
}));

describe("Email Verification API", () => {
  it("should return typo suggestion for gmal.com", async () => {
    const response = await request(app)
      .post("/api/verify")
      .send({ email: "test@gmal.com" });

    expect(response.status).toBe(200);
    expect(response.body.subresult).toBe("typo_detected");
    expect(response.body.didyoumean).toBe("test@gmail.com");
  });

  it("should return invalid_syntax for a broken email", async () => {
    const response = await request(app)
      .post("/api/verify")
      .send({ email: "invalid-email-format" });

    expect(response.body.subresult).toBe("invalid_syntax");
  });

  it("should return valid for a correct email with MX records", async () => {
    // importing mocked functions and making changes to them
    const { getMxRecords, checkMailbox } =
      await import("../src/services/smtpService.js");

    // mock acts like a real DNS lookup that finds Gmail's MX records
    (getMxRecords as any).mockResolvedValue(["gmail-smtp-in.l.google.com"]);
    (checkMailbox as any).mockResolvedValue({
      exists: true,
      subresult: "mailbox_exists",
    });

    const response = await request(app)
      .post("/api/verify")
      .send({ email: "real-user@gmail.com" });

    // verify results
    expect(response.body.result).toBe("valid");
    expect(response.body.resultcode).toBe(1);
    expect(response.body.mxRecords).toContain("gmail-smtp-in.l.google.com");
  });
});
