// Handles request/response logic for email verification
// takes user request
// runs through all the logic written validator, typoservice and smtp etc. etc.
// send JSON response back

import type { Request, Response } from "express";
import { isValidSyntax, extractDomain } from "../utils/validator.js";
import { getDidYouMean } from "../services/typoService.js";
// Changed: Using the smtpService object to allow for easier testing/mocking in ESM
import { smtpService } from "../services/smtpService.js";

// for the email verification request
// combines all the stuff: syntax, typo, DNS, and SMTP checks.
export const verifyEmailHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const startTime = Date.now();
  const { email } = req.body;

  // response structure
  const resultData: any = {
    email: email || "",
    result: "invalid",
    resultcode: 6,
    subresult: "invalid_syntax",
    domain: "",
    mxRecords: [],
    didyoumean: null,
    executiontime: 0,
    error: null,
    timestamp: new Date().toISOString(),
  };

  try {
    // syntax Check
    if (!email || !isValidSyntax(email)) {
      // Check for typos only if syntax is bad
      resultData.didyoumean = getDidYouMean(email || "");
      resultData.subresult = resultData.didyoumean
        ? "typo_detected"
        : "invalid_syntax";
      res.json(finalize(resultData, startTime));
      return;
    }

    // NEW: Priority Typo Check
    // If syntax is valid, but the domain looks like a typo, stop here.
    const typoSuggestion = getDidYouMean(email);
    if (typoSuggestion) {
      resultData.domain = extractDomain(email);
      resultData.didyoumean = typoSuggestion;
      resultData.subresult = "typo_detected";
      res.json(finalize(resultData, startTime));
      return;
    }

    const domain = extractDomain(email);
    resultData.domain = domain;

    // DNS MX Lookup
    // Updated to use the smtpService object
    const mxRecords = await smtpService.getMxRecords(domain);
    resultData.mxRecords = mxRecords;

    if (mxRecords.length === 0) {
      resultData.didyoumean = getDidYouMean(email);
      resultData.subresult = resultData.didyoumean
        ? "typo_detected"
        : "no_mx_records";
      res.json(finalize(resultData, startTime));
      return;
    }

    // SMTP Verification
    // trying the highest priority MX record
    // Updated to use the smtpService object
    const smtpCheck = await smtpService.checkMailbox(email, mxRecords[0]!);

    if (smtpCheck.exists) {
      resultData.result = "valid";
      resultData.resultcode = 1;
      resultData.subresult = "mailbox_exists";
    } else {
      const isHardBounce = smtpCheck.subresult === "mailbox_does_not_exist";
      resultData.result = isHardBounce ? "invalid" : "unknown";
      resultData.resultcode = isHardBounce ? 6 : 3;
      resultData.subresult = smtpCheck.subresult;
      resultData.error = smtpCheck.error || null;
    }
  } catch (err: any) {
    resultData.result = "unknown";
    resultData.resultcode = 3;
    resultData.subresult = "internal_error";
    resultData.error = err.message;
  }

  res.json(finalize(resultData, startTime));
};

function finalize(data: any, start: number) {
  data.executiontime = parseFloat(((Date.now() - start) / 1000).toFixed(2));
  return data;
}