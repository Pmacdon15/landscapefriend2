import { verifyWebhook, type WebhookEvent } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { rebalanceClientsForOrg } from "@/dal/rebalance";
import {
  handleOrganizationCreatedDal,
  handleUserCreatedDal,
} from "@/dal/webhooks";

export async function POST(req: NextRequest) {
  try {
    const evt = (await verifyWebhook(req, {
      signingSecret: process.env.CLERK_WEBHOOK_SIGNING_SECRET,
    })) as WebhookEvent;

    console.log("Web Hook :", evt.type, " ", evt.data);

    try {
      switch (evt.type) {
        case "user.created": {
          const data = evt.data;
          const userId = data.id;
          const userName =
            `${data.first_name || ""} ${data.last_name || ""}`.trim() ||
            data.username ||
            data.email_addresses[0]?.email_address;

          const userEmail = data.email_addresses[0]?.email_address;
          if (!userEmail) {
            console.error("User created event without email address");
            break;
          }
          await handleUserCreatedDal(userId, userName, userEmail);
          break;
        }

        case "organization.created": {
          const orgId = evt.data.id;
          const orgName = evt.data.name;
          await handleOrganizationCreatedDal(orgId, orgName);
          break;
        }

        case "subscriptionItem.active": {
          const data = evt.data as any;
          const orgId = data.organization_id;
          const status = data.status;

          console.log(
            `[Clerk Webhook] Received subscription event ${evt.type} for org ${orgId}. Status: ${status}`,
          );

          if (orgId && status === "active") {
            await rebalanceClientsForOrg(orgId);
          }
          break;
        }

        default:
          console.log(`Unhandled event type: ${evt.type}`);
          break;
      }
    } catch (error) {
      console.error("Error handling webhook event:", error);
    }

    return new Response("Webhook received", { status: 200 });
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error :", err.message);
    } else {
      console.error("Error :", err);
    }
    return new Response("Error", { status: 401 });
  }
}
