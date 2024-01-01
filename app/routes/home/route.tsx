import {
  LoaderFunctionArgs,
  ActionFunctionArgs,
  redirect,
  json,
} from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { decks } from "../../../db/schema";
import { db } from "../../../db/index";
import React from "react";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { drizzle } from "../../utils/db.server";
import { userDeckSubscriptions } from "../../../db/schema";
import { getAuthCookie, requireAuthCookie } from "../../auth";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getAuthCookie(request);
  const allDecks = await drizzle
    .select()
    .from(decks)
    .innerJoin(
      userDeckSubscriptions,
      eq(decks.id, userDeckSubscriptions.deckID)
    );

  if (!userId) {
    return json({ allDecks, userSubscriptions: null, isAuth: false } as const);
  }

  const userSubscriptions = await drizzle
    .select()
    .from(userDeckSubscriptions)
    .where(eq(userDeckSubscriptions.userID, userId));
  return json({ allDecks, isAuth: true, userSubscriptions } as const);
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const userId = await requireAuthCookie(request);
  const formData = await request.formData();
  const deckId = z.coerce.number().parse(formData.get("deckId"));
  const isSubscribeAction = formData.has("subscribe");

  try {
    if (isSubscribeAction) {
      const subscribe = Boolean(
        z.coerce.number().parse(formData.get("subscribe"))
      );
      console.log({ subscribe });
      const [existingSubscription] = await db
        .select()
        .from(userDeckSubscriptions)
        .where(
          and(
            eq(userDeckSubscriptions.deckID, deckId),
            eq(userDeckSubscriptions.userID, userId)
          )
        )
        .limit(1);

      if (existingSubscription) {
        await db
          .update(userDeckSubscriptions)
          .set({ subscribed: subscribe })
          .where(eq(userDeckSubscriptions.id, existingSubscription.id));
      } else {
        await db
          .insert(userDeckSubscriptions)
          .values({ userID: userId, deckID: deckId, subscribed: subscribe });
      }
      return null;
    } else if (!isSubscribeAction) {
      await db.delete(decks).where(eq(decks.id, deckId));
      return redirect(`/decks`);
    }
  } catch (error) {
    console.log({ deck_delete_error: params.error });
    return null;
  }
};

export default function Home() {
  const { allDecks, userSubscriptions, isAuth } =
    useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const dataArray = allDecks;
  console.log({ dataArray });
  console.log({
    dataArray: dataArray.map((deck) => deck.userDeckSubcriptions.subscribed),
  });

  return (
    <>
      <h1>Your Decks</h1>
      <div className="deck-container">
        {isAuth
          ? dataArray.map((deck) => {
              const isSubscribed =
                Number(fetcher.formData?.get("deckId")) === deck.decks.id
                  ? Boolean(fetcher.formData?.get("subscribe"))
                  : userSubscriptions?.find(
                      (subscription) => subscription.deckID === deck.decks.id
                    )?.subscribed;
              return isSubscribed ? (
                <div className="deck-box">
                  <h2>{deck.decks.name}</h2> <br />
                  completion - {deck.userDeckSubcriptions.completion} <br />
                  <fetcher.Form method="POST">
                    <input type="hidden" name="deckId" value={deck.decks.id} />
                    <button
                      aria-label="Toggle Subscription"
                      className="subscribed"
                      name="unsubscribe"
                      value={isSubscribed ? 0 : 1}
                    >
                      {deck.userDeckSubcriptions.subscribed
                        ? "UNSUBSCRIBE"
                        : null}
                    </button>
                  </fetcher.Form>
                </div>
              ) : null;
            })
          : null}
      </div>
    </>
  );
}
