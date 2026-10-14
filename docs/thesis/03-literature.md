# Chapter 3. Review of Related Literature and Systems

This chapter reviews the ideas and existing systems that Poopipoo builds on: crowdsourced mapping, restroom finder applications, AI in mapping, retrieval-augmented generation, gamification and local-first software. It ends with a synthesis of the gap this project addresses.

## 3.1 Crowdsourced mapping

### Volunteered geographic information

Goodchild (2007) described ordinary people acting as "sensors" who create and share geographic information, which he called **volunteered geographic information (VGI)**. VGI can be more current and more local than official maps, but its quality varies with the number and care of the contributors.

### OpenStreetMap (2004)

OpenStreetMap (OSM) was started in 2004 in the United Kingdom by Steve Coast as a free, editable map of the world (Haklay & Weber, 2008). Its data is released under the Open Database License (ODbL). Haklay (2010) compared OSM with the Ordnance Survey's official data for England and found that OSM was fairly accurate in areas with many contributors, but its completeness varied widely between places. The same pattern is visible in Poopipoo's import: 585 public toilets were imported for Metro Manila, but only 15 for Bacolod.

Relevance to Poopipoo: OSM supplies the base map, the 829 imported restrooms, place search (Nominatim) and routing data (OSRM).

### Waze (2006)

Waze began in Israel in 2006 as the community mapping project FreeMap Israel and became a navigation app in which drivers report traffic, accidents and hazards while they drive. Google acquired it in 2013. *[to verify: exact dates with a news or company source]* Waze shows that users will contribute data in real time when contributing is easy and they benefit immediately from what others share.

Relevance: Poopipoo is described as the "Waze for restrooms": every user can find, confirm, review and report restrooms, and others benefit at once.

### Google Maps Local Guides (2015)

Local Guides is Google's program, launched in 2015, in which users earn points and levels for reviews, photos, ratings and edits to places on Google Maps. *[to verify]* It shows that gamified contributions can produce data at a very large scale, but the data belongs to a private platform and its reuse is restricted by Google's terms.

Relevance: Poopipoo uses a similar points-and-levels model, but keeps the data on an open platform and imports from and credits OpenStreetMap instead.

## 3.2 Restroom finder applications

| Application | Year | Data source | Notes |
| --- | --- | --- | --- |
| SitOrSquat | 2008 (Charmin sponsorship from 2009) | Crowdsourced | One of the first restroom-finder apps; users marked restrooms "sit" (clean) or "squat" (not clean). Sponsored by the toilet-paper brand Charmin (Procter & Gamble). |
| Flush Toilet Finder & Map | 2015 | Public datasets + user additions | Developed by Jake Ruston (JRustonApps) as a university student; free with ads, plus a paid version. |
| OSM-based "toilet finder" apps | various | OpenStreetMap | Several apps (for example, "Toilet Finder – WC Map" and LavSeeker) display OSM `amenity=toilets` data. They display the OSM data. |

Sources: Drug Store News (2009); App Pricing Lab listings for Flush (2015); Capital FM (2015); App Store and AlternativeTo listings.

Common limitations of these apps for Philippine users:

- coverage and community activity are concentrated in North America and Europe;
- no Tagalog interface;
- amenities that matter locally, such as a **bidet**, are often not recorded;
- ads, paid tiers, or sponsorship by a commercial brand;
- no conversational search.

## 3.3 AI in mapping

Large language models are increasingly combined with maps. General-purpose chat assistants can answer questions about places, and map platforms have begun to add LLM features that summarize reviews and answer questions about places. *[to verify: cite the specific product announcements, e.g., Google's 2024 announcements about Gemini in Google Maps]*

A known problem is **hallucination**: a language model that answers from memory can invent a place, an address or an opening time. For a restroom finder, an invented CR is worse than no answer.

Two techniques reduce this risk:

- **Tool use (function calling).** The model does not answer from memory. Instead, it calls functions that query a real database and then writes its answer from the results. ReAct (Yao et al., 2023) showed that interleaving reasoning with actions improves factual accuracy, and Toolformer (Schick et al., 2023) showed that language models can learn when to call tools.
- **Open-weight models on fast inference hardware.** Groq serves open-weight models (such as the Llama family and OpenAI's `gpt-oss` models, released in 2025) on its own LPU hardware, with a free tier. Poopipoo uses `gpt-oss-120b` on Groq because it reliably calls tools.

Relevance: Poopipoo's assistant has three tools: `search_restrooms`, `get_distance` (to a restroom from the user's location) and `start_navigation` (opens directions in the app). Its instructions require it to answer only from tool results.

## 3.4 Retrieval-Augmented Generation (RAG)

Lewis et al. (2020) introduced **Retrieval-Augmented Generation**: before generating an answer, the system retrieves relevant documents from an external store and gives them to the model as context. This grounds the answer in up-to-date, verifiable data and lets the data change without retraining the model.

RAG relies on **semantic search** with text embeddings:

- **Sentence-BERT** (Reimers & Gurevych, 2019) produces sentence embeddings that can be compared with cosine similarity.
- **MiniLM** (Wang et al., 2020) is a compact distilled transformer. The sentence-transformers model *all-MiniLM-L6-v2*, built on it, gives 384-dimension embeddings that are small and fast enough to run on an ordinary server CPU.
- **pgvector** (Kane, 2021) is a PostgreSQL extension that stores vectors and finds the nearest ones, so semantic search can run in the same database as the rest of the data.
- **HNSW** (Malkov & Yashunin, 2020) is the approximate nearest-neighbour index that pgvector uses to keep these searches fast as the data grows.

Relevance: each restroom is turned into a short document (name, description, address, amenities, price) and embedded. A question is embedded the same way, and `match_restrooms()` in PostgreSQL returns the most similar restrooms, which the model then answers from. If embeddings are unavailable, the system falls back to keyword search.

## 3.5 Gamification

Deterding et al. (2011) defined **gamification** as "the use of game design elements in non-game contexts". In a literature review, Hamari et al. (2014) found that gamification generally has positive effects on motivation and participation, but that the effects depend on the context and on the users.

Examples relevant to this project:

- **Duolingo:** streaks, experience points and leagues keep learners returning daily.
- **Waze:** points and rankings for reports and map edits.
- **Foursquare** (2009): badges and "mayorships" for checking in to places, an early example of gamified location sharing.

Relevance: Poopipoo awards points for useful actions (adding a restroom, writing a review, receiving a "helpful" vote) and uses levels, badges and a leaderboard. To prevent cheating, points are computed by database triggers, not by the app, and are taken back when the content is deleted, so users cannot farm points by adding and deleting the same restroom.

## 3.6 Trust and moderation in open platforms

Open contribution invites abuse: spam, fake entries and duplicate accounts. Douceur (2002) described the **Sybil attack**, in which one person creates many identities to gain influence. Common defences include rate limits, reputation systems and requiring agreement from several independent users.

Relevance: Poopipoo combines rate limits (a new restroom at most every 5 minutes, 5 per day and 20 per week per user), community verification (5 confirmations approve a restroom), reports (3 flag an item, 5 hide it), a trust score, AI screening of new restrooms, bans and a moderator dashboard. These rules are enforced inside PostgreSQL, so they cannot be bypassed by calling the API directly.

## 3.7 Local-first software and privacy-first design

Kleppmann et al. (2019) proposed **local-first software**: software in which users' data lives primarily on their own devices, works offline, and remains under their control, with the cloud used for syncing and collaboration.

Poopipoo is not fully local-first, because a shared restroom database must live on a server. It applies several of the principles, however:

- personal preferences and recent searches stay on the device;
- the PWA keeps visited pages available offline;
- the core features work without an account;
- users can export their data and delete their account.

This also matches the data-minimization principle of the Philippine **Data Privacy Act of 2012 (Republic Act No. 10173)**, which requires that personal data be collected only for declared purposes and be limited to what is necessary.

## 3.8 Synthesis

| Need | SitOrSquat / Flush | Google Maps | Waze | OSM apps | **Poopipoo** |
| --- | --- | --- | --- | --- | --- |
| Restroom-focused | Yes | No | No | Yes | **Yes** |
| Free, no ads | Partly | Yes (ads/data) | Yes (ads) | Varies | **Yes** |
| Open data | No | No | No | Yes | **Yes (OSM, ODbL)** |
| Philippine amenities (bidet, *tabo*, PWD) | No | No | No | Partly | **Yes** |
| Tagalog interface | No | Yes | Yes | Rarely | **Yes** |
| Natural-language assistant | No | Emerging | No | No | **Yes (RAG, grounded)** |
| Built-in moderation | Basic | Yes | Yes | OSM community | **Yes (database-enforced)** |

No reviewed system combines a restroom focus, open data, Philippine-specific amenities, a Tagalog interface and a grounded AI assistant in a free product. Poopipoo addresses this gap.

---

## References

*(Also included in the full reference list in [Chapter 10](10-references.md).)*

Deterding, S., Dixon, D., Khaled, R., & Nacke, L. (2011). From game design elements to gamefulness: Defining "gamification". In *Proceedings of the 15th International Academic MindTrek Conference* (pp. 9–15). ACM. https://doi.org/10.1145/2181037.2181040

Douceur, J. R. (2002). The Sybil attack. In *Peer-to-Peer Systems (IPTPS 2002)*, Lecture Notes in Computer Science, vol. 2429 (pp. 251–260). Springer.

Drug Store News. (2009, March 24). *Charmin launches global sponsorship of Sit or Squat web site and mobile phone application.* https://drugstorenews.com/center-store/charmin-launches-global-sponsorship-sit-or-squat-web-site-and-mobile-phone-application

Goodchild, M. F. (2007). Citizens as sensors: The world of volunteered geography. *GeoJournal, 69*(4), 211–221. https://doi.org/10.1007/s10708-007-9111-y

Haklay, M. (2010). How good is volunteered geographical information? A comparative study of OpenStreetMap and Ordnance Survey datasets. *Environment and Planning B: Planning and Design, 37*(4), 682–703. https://doi.org/10.1068/b35097

Haklay, M., & Weber, P. (2008). OpenStreetMap: User-generated street maps. *IEEE Pervasive Computing, 7*(4), 12–18. https://doi.org/10.1109/MPRV.2008.80

Hamari, J., Koivisto, J., & Sarsa, H. (2014). Does gamification work? A literature review of empirical studies on gamification. In *Proceedings of the 47th Hawaii International Conference on System Sciences* (pp. 3025–3034). IEEE. https://doi.org/10.1109/HICSS.2014.377

Kane, A. (2021). *pgvector: Open-source vector similarity search for Postgres* [Computer software]. https://github.com/pgvector/pgvector

Kleppmann, M., Wiggins, A., van Hardenberg, P., & McGranaghan, M. (2019). Local-first software: You own your data, in spite of the cloud. In *Proceedings of the 2019 ACM SIGPLAN International Symposium on New Ideas, New Paradigms, and Reflections on Programming and Software (Onward! '19)* (pp. 154–178). ACM. https://doi.org/10.1145/3359591.3359737

Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Lewis, M., Yih, W., Rocktäschel, T., Riedel, S., & Kiela, D. (2020). Retrieval-augmented generation for knowledge-intensive NLP tasks. In *Advances in Neural Information Processing Systems 33 (NeurIPS 2020)* (pp. 9459–9474).

Luxen, D., & Vetter, C. (2011). Real-time routing with OpenStreetMap data. In *Proceedings of the 19th ACM SIGSPATIAL International Conference on Advances in Geographic Information Systems* (pp. 513–516). ACM. https://doi.org/10.1145/2093973.2094062

Malkov, Y. A., & Yashunin, D. A. (2020). Efficient and robust approximate nearest neighbor search using hierarchical navigable small world graphs. *IEEE Transactions on Pattern Analysis and Machine Intelligence, 42*(4), 824–836. https://doi.org/10.1109/TPAMI.2018.2889473

Presidential Decree No. 856. (1975). *Code on Sanitation of the Philippines.*

Reimers, N., & Gurevych, I. (2019). Sentence-BERT: Sentence embeddings using Siamese BERT-networks. In *Proceedings of the 2019 Conference on Empirical Methods in Natural Language Processing (EMNLP-IJCNLP)* (pp. 3982–3992). ACL. https://doi.org/10.18653/v1/D19-1410

Republic Act No. 10173. (2012). *Data Privacy Act of 2012.*

Schick, T., Dwivedi-Yu, J., Dessì, R., Raileanu, R., Lomeli, M., Hambro, E., Zettlemoyer, L., Cancedda, N., & Scialom, T. (2023). Toolformer: Language models can teach themselves to use tools. In *Advances in Neural Information Processing Systems 36 (NeurIPS 2023)*.

Wang, W., Wei, F., Dong, L., Bao, H., Yang, N., & Zhou, M. (2020). MiniLM: Deep self-attention distillation for task-agnostic compression of pre-trained transformers. In *Advances in Neural Information Processing Systems 33 (NeurIPS 2020)*.

Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K., & Cao, Y. (2023). ReAct: Synergizing reasoning and acting in language models. In *International Conference on Learning Representations (ICLR 2023)*.

*[to verify before submission: page numbers and DOIs against each publisher's page; add citations for Waze, Google Local Guides, Duolingo, Foursquare and the Gemini/Google Maps announcements]*
