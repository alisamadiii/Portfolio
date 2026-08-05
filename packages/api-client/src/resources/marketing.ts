import type { AgencyClient } from "../client.js";
import type { Result } from "../error.js";
import type {
  MarketingActRequest,
  MarketingSendResponse,
  MarketingSubscribeRequest,
  MarketingSubscribeResponse,
  MarketingTestResponse,
  MarketingTransitionResponse,
} from "../types.js";

// Public marketing surface: exactly one thing — newsletter signup from a
// client website (ak_pub_ key in the browser, origin-checked). Campaign
// management lives on AdminResource; websites have no business with it.
export class MarketingResource {
  constructor(private readonly client: AgencyClient) {}

  /**
   * Subscribe a visitor to your marketing contact list. Idempotent: an
   * existing contact is re-subscribed (a signup form submission is an explicit
   * opt-in, even after an earlier unsubscribe). Rate limited per IP.
   */
  subscribe(
    params: MarketingSubscribeRequest
  ): Promise<Result<MarketingSubscribeResponse>> {
    return this.client.request("POST", "/v1/marketing/subscribe", {
      body: params,
    });
  }
}

// Campaign lifecycle — admin keys only (the hub calls these with the campaign
// owner's userId). Routes live under /v1/marketing but behave like admin
// operations: non-admin keys can only act on their own campaigns.
export class AdminMarketingResource {
  constructor(private readonly client: AgencyClient) {}

  /**
   * Start sending a draft campaign to all subscribed contacts. Returns 202 —
   * the send runs in a background workflow.
   */
  send(
    campaignId: string,
    params: MarketingActRequest = {}
  ): Promise<Result<MarketingSendResponse>> {
    return this.client.request("POST", `/v1/marketing/campaigns/${campaignId}/send`, {
      body: params,
    });
  }

  /** Send a personalized test of the campaign to the owner's account email. */
  test(
    campaignId: string,
    params: MarketingActRequest = {}
  ): Promise<Result<MarketingTestResponse>> {
    return this.client.request("POST", `/v1/marketing/campaigns/${campaignId}/test`, {
      body: params,
    });
  }

  pause(
    campaignId: string,
    params: MarketingActRequest = {}
  ): Promise<Result<MarketingTransitionResponse>> {
    return this.client.request("POST", `/v1/marketing/campaigns/${campaignId}/pause`, {
      body: params,
    });
  }

  resume(
    campaignId: string,
    params: MarketingActRequest = {}
  ): Promise<Result<MarketingTransitionResponse>> {
    return this.client.request("POST", `/v1/marketing/campaigns/${campaignId}/resume`, {
      body: params,
    });
  }

  cancel(
    campaignId: string,
    params: MarketingActRequest = {}
  ): Promise<Result<MarketingTransitionResponse>> {
    return this.client.request("POST", `/v1/marketing/campaigns/${campaignId}/cancel`, {
      body: params,
    });
  }
}
