import { DISCORD_CLIENT_ID, DISCORD_REDIRECT_URI } from "@/env/constants";
import { NextApiRequest, NextApiResponse } from "next";
import { cookies } from "next/headers";

/**
 * Route configured in the Discord developer console which facilitates the
 * connection between Discord and any additional services you may use. 
 * To start the flow, generate the OAuth2 consent dialog url for Discord, 
 * and redirect the user there.
 */
export async function GET(request: NextApiRequest, response: NextApiResponse) {
    const { url, state } = getAuthorizationUrl();

    // Store the signed state param in the user's cookies so we can verify
    // the value later. See:
    // https://discord.com/developers/docs/topics/oauth2#state-and-security
    cookies().set('clientState', state, { maxAge: 1000 * 60 * 5, secure: true });

    // Send the user to the Discord owned OAuth2 authorization endpoint
    response.redirect(url);
}

function getAuthorizationUrl()
{
    const state = crypto.randomUUID();

    const url = new URL('https://discord.com/api/oauth2/authorize');
    url.searchParams.set('client_id', DISCORD_CLIENT_ID);
    url.searchParams.set('redirect_uri', DISCORD_REDIRECT_URI);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('state', state);
    url.searchParams.set('scope', 'guilds role_connections.write identify');
    url.searchParams.set('prompt', 'consent');

    return { state, url: url.toString() };
}