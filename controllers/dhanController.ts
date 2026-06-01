import { Request, Response } from "express";
import { dhanServiceInstance } from "../services/dhanService.js";

/**
 * Dhan Controller to handle incoming HTTP REST requests
 */
export class DhanController {
  
  /**
   * Simple Test Endpoint
   * GET /test
   */
  getTest(req: Request, res: Response) {
    console.log("[DhanController] Test endpoint pinged");
    return res.status(200).send("Server running");
  }

  /**
   * Fetch Funds Details Handler
   * GET /funds
   */
  async getFunds(req: Request, res: Response) {
    try {
      console.log("[DhanController] Processing request to fetch funds...");
      const fundsData = await dhanServiceInstance.getFunds();
      return res.status(200).json(fundsData);
    } catch (error: any) {
      console.error("[DhanController] Exception in getFunds:", error.message);
      
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        error: statusCode === 401 ? "Unauthorized" : "API Error",
        message: error.message || "An unexpected error occurred while fetching funds.",
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Fetch Option Chain Handler
   * POST /option-chain
   */
  async getOptionChain(req: Request, res: Response) {
    try {
      const { UnderlyingScrip, UnderlyingSeg, Expiry } = req.body;

      console.log(`[DhanController] Processing option chain request...`);

      // Simple payload validation
      if (UnderlyingScrip === undefined || !UnderlyingSeg || !Expiry) {
        return res.status(400).json({
          error: "Bad Request",
          message: "A JSON payload containing 'UnderlyingScrip', 'UnderlyingSeg', and 'Expiry' is required.",
          receivedPayload: req.body
        });
      }

      const optionChainData = await dhanServiceInstance.getOptionChain({
        UnderlyingScrip: Number(UnderlyingScrip),
        UnderlyingSeg,
        Expiry
      });

      return res.status(200).json(optionChainData);
    } catch (error: any) {
      console.error("[DhanController] Exception in getOptionChain:", error.message);

      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        error: statusCode === 401 ? "Unauthorized" : "API Error",
        message: error.message || "An unexpected error occurred while fetching the option chain.",
        timestamp: new Date().toISOString()
      });
    }
  }
}

export const dhanControllerInstance = new DhanController();
