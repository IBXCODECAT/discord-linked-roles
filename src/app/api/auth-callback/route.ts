import { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI } from "@/env/constants";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * Route configured in the Discord developer console, the redirect Url to which
 * the user is sent after approving the bot for their Discord account. This
 * completes a few steps:
 * 1. Uses the code to acquire Discord OAuth2 tokens
 * 2. Uses the Discord Access Token to fetch the user profile
 * 3. Stores the OAuth2 Discord Tokens in Redis / Firestore
 * 4. Lets the user know it's all good and to go back to Discord
 */
export async function GET(request: NextApiRequest, response: NextApiResponse) {
    try {
        // 1. Uses the code and state to acquire Discord OAuth2 tokens
        const code = request.query.code as string;
        const discordState = request.query.state as string;

        const cookiesList = cookies();

        // make sure the state parameter exists
        if(cookiesList.has('clientState'))
        {
            const clientState = cookiesList.get('clientState');

            if(clientState?.value !== discordState)
            {
                console.error('State verification failed.');
                return response.status(403).send('State verification failed.');
            }

            const tokens = await getOAuthTokens(code);

            // 2. Uses the Discord Access Token to fetch the user profile
            const meData = await discord.getUserData(tokens);
            const userId = meData.user.id;
            
            /*
            await storage.storeDiscordTokens(userId, {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at: Date.now() + tokens.expires_in * 1000,
            });*/

            // 3. Update the users metadata, assuming future updates will be posted to the `/update-metadata` endpoint
            
            let linkedRolesMetadata;

            try
            {
                
            }
            catch(error)
            {
                linkedRolesMetadata = {
                    is_verified: null,
                    is_matc_mothership: null,
                };
            }

            return response.send('Success! You can now go back to Discord.');
        }
        else
        {
            console.error('No state cookie.');
            return response.status(401).send('No state cookie.');
        }
    }
    catch(error)
    {
        console.error(error);
        return response.status(500).send('Internal Server Error');
    }
}

/**
 * Given an OAuth2 code from the scope approval page, make a request to Discord's
 * OAuth2 service to retrieve an access token, refresh token, and expiration.
 */
export async function getOAuthTokens(code: string) {
  const url = 'https://discord.com/api/v10/oauth2/token';
  const body = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: DISCORD_REDIRECT_URI,
  });

  const response = await fetch(url, {
    body,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  if (response.ok) {
    const data = await response.json();
    return data;
  } else {
    throw new Error(`Error fetching OAuth tokens: [${response.status}] ${response.statusText}`);
  }
}

/**
 * The initial token request comes with both an access token and a refresh
 * token.  Check if the access token has expired, and if it has, use the
 * refresh token to acquire a new, fresh access token.
 */
export async function getAccessToken(userId: string, tokens) {
    if (Date.now() > tokens.expires_at) {
      const url = 'https://discord.com/api/v10/oauth2/token';
      const body = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh_token,
      });
      const response = await fetch(url, {
        body,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      if (response.ok) {
        const tokens = await response.json();
        tokens.expires_at = Date.now() + tokens.expires_in * 1000;
        //await storage.storeDiscordTokens(userId, tokens);
        return tokens.access_token;
      } else {
        throw new Error(`Error refreshing access token: [${response.status}] ${response.statusText}`);
      }
    }
    return tokens.access_token;
  }