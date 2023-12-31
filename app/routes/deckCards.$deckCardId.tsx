import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { eq } from "drizzle-orm";
import {
  Form,
  useLoaderData,
  Link,
  useFetcher,
  Outlet,
} from "@remix-run/react";
import React from "react";

import { drizzle } from "../utils/db.server";
import { deckCards, decks, cards } from "../../db/schema";
import { z } from "zod";

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    const singleDeckCard = await drizzle
      .select()
      .from(deckCards)
      .innerJoin(decks, eq(deckCards.deckID, decks.id))
      .innerJoin(cards, eq(deckCards.cardID, cards.id))
      .where(eq(deckCards.id, Number(params.deckCardId)));
    return json(singleDeckCard);
  } catch (error) {
    console.error("Loader error:", error);
    throw new Response("Error loading deck cards", { status: 500 });
  }
}

const deckCardIdSchema = z.object({
  deckCardId: z.string(),
});

export const action = async ({ params }: ActionFunctionArgs) => {
  const parsedDeckCardId = deckCardIdSchema.safeParse(params.deckCardId);

  console.log({ cardz_delete_error: params.error });

  if (!parsedDeckCardId.success) {
    return json({ error: "No deck card id provided" }, { status: 400 });
  }

  try {
    await drizzle
      .delete(deckCards)
      .where(eq(deckCards.cardID, Number(parsedDeckCardId)));
    return redirect(`/deckCards`);
  } catch (error) {
    return json({ status: "error" });
  }
};

export default function DeckCards() {
  const singleDeckCard = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  if (!singleDeckCard || singleDeckCard.length === 0) {
    return <div>Decks not found.</div>;
  }

  console.log({ singleDeckCard });
  return (
    <div id="deck">
      <h1>Single Card View</h1>
      <div className="single-card-container">
        {singleDeckCard.map((card) => {
          return (
            <div key={card.cards.id} className="card-box">
              <div className="single-card">
                <h2>{card.cards.front}</h2>
                <h2>{card.cards.back}</h2>
                <h2>{card.cards.CEFR_level}</h2>
                <h2>{card.cards.frequency}</h2>
              </div>
              {/* <Link to={`/decks/${singleDeckCard.id}/edit`}>Edit</Link> */}
              <Form method="post">
                <button type="submit">Remove</button>
              </Form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
