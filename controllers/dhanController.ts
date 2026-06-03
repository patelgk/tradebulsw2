import { Request, Response } from "express";
import axios from "axios";

const BASE_URL = "https://api.dhan.co/v2";

function getCredentials() {
  const token    = process.env.VITE_DHAN_ACCESS_TOKEN || process.env.DHAN_ACCESS_TOKEN || "";
  const clientId = process.env.VITE_DHAN_CLIENT_ID    || process.env.DHAN_CLIENT_ID    || "";
  if (!token || !clientId) {
    const e: any = new Error("Missing Dhan API credentials (DHAN_ACCESS_TOKEN, DHAN_CLIENT_ID)");
    e.statusCode = 401;
    throw e;
  }
  return { token, clientId };
}

export class DhanController {

  getTest(_req: Request, res: Response) {
    res.status(200).send("Server running");
  }

  async getFunds(_req: Request, res: Response) {
    try {
      const { token, clientId } = getCredentials();
      const r = await axios.get(`${BASE_URL}/fundlimit`, {
        headers: { "access-token": token, "client-id": clientId, "Content-Type": "application/json" },
        timeout: 10000,
      });
      res.json(r.data);
    } catch (err: any) {
      const status = err.statusCode || err.response?.status || 500;
      res.status(status).json({ error: err.message });
    }
  }

  async getOptionChain(req: Request, res: Response) {
    try {
      const { UnderlyingScrip, UnderlyingSeg, Expiry } = req.body;
      if (UnderlyingScrip === undefined || !UnderlyingSeg || !Expiry) {
        return res.status(400).json({ error: "UnderlyingScrip, UnderlyingSeg and Expiry are required" });
      }
      const { token, clientId } = getCredentials();
      const r = await axios.post(
        `${BASE_URL}/optionchain`,
        { UnderlyingScrip: Number(UnderlyingScrip), UnderlyingSeg, Expiry },
        {
          headers: { "access-token": token, "client-id": clientId, "Content-Type": "application/json" },
          timeout: 10000,
        }
      );
      res.json(r.data);
    } catch (err: any) {
      const status = err.statusCode || err.response?.status || 500;
      res.status(status).json({ error: err.message });
    }
  }
}

export const dhanControllerInstance = new DhanController();
