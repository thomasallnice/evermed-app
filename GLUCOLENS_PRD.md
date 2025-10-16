# **GlucoLens - Product Requirements Document**

**Version:** 1.0  
**Date:** October 15, 2025  
**Status:** IMMEDIATE IMPLEMENTATION  
**Previous Product:** EverMed (DEPRECATED)

---

## **1. EXECUTIVE SUMMARY**

### **1.1 The Pivot**
We are pivoting from EverMed (broad health document vault) to **GlucoLens** (focused glucose/food tracker). This is a complete pivot, not a feature addition. The entire codebase, database, and user experience must be rebuilt around one core value proposition: **"See how food affects your blood sugar."**

### **1.2 The Opportunity**
- **133 million** Americans have diabetes or prediabetes
- **$327 billion** annual diabetes costs in the US
- **87%** of people with prediabetes don't know they have it
- CGM market growing **32% annually**, reaching mainstream adoption
- Existing apps (MySugr, Glucose Buddy) lack photo-based tracking and AI predictions

### **1.3 Our Solution**
GlucoLens is the Instagram for glucose tracking - simple, visual, and addictive. Users snap photos of their meals, track glucose (manually or via CGM), and see personalized predictions of how foods will affect their blood sugar. Over time, the app learns each user's unique metabolic response.

---

## **2. STARTUP DESCRIPTION**

### **2.1 Company Vision**
**"Making metabolic health as simple as taking a photo"**

We believe everyone should understand how food affects their body. By combining computer vision, continuous glucose monitoring, and machine learning, we're building the first truly intelligent glucose management platform that learns and adapts to each individual.

### **2.2 Elevator Pitch**
"GlucoLens is Shazam for blood sugar. Snap a photo of any meal and instantly see how it will affect your glucose levels. We integrate with CGMs and Apple Health to track your actual response, then use ML to get smarter about YOUR specific metabolism. It's like having a diabetes educator in your pocket for $9.99/month."

### **2.3 Company Values**
- **Simplicity First** - If it takes more than 2 taps, we've failed
- **Privacy by Design** - Your health data never leaves your control
- **Evidence-Based** - Every prediction backed by your real data
- **Daily Utility** - Used 3-5 times per day, not occasionally
- **Accessible** - Works for Type 1, Type 2, prediabetes, or health optimization

### **2.4 Business Model**
- **Freemium SaaS** with premium at $9.99-29.99/month
- **B2C primary**, B2B2C opportunity (employers, insurers)
- **Data moat** through personalized ML models
- **Network effects** through shared meal database

---

## **3. TARGET GROUPS**

### **3.1 Primary: The Newly Diagnosed** (40% of users)

**Demographics:**
- Age: 45-65
- Income: $50K-100K
- Location: Suburban US
- Tech comfort: Moderate (uses smartphone daily)

**Psychographics:**
- Recently diagnosed with Type 2 diabetes or prediabetes
- Overwhelmed by dietary restrictions
- Motivated by fear (complications) and hope (reversal)
- Wants simple, clear guidance
- Trusts technology but needs hand-holding

**Pain Points:**
- "I don't know what I can eat anymore"
- "My doctor said 'watch your carbs' but what does that mean?"
- "I'm scared of going blind/losing a foot"
- "The fingersticks hurt and I keep forgetting"

**Jobs to be Done:**
- Understand which foods spike glucose
- Track without constant fingersticks
- Feel in control of their condition
- Avoid medication escalation

**User Journey:**
1. Diagnosed at annual physical
2. Googles "diabetes diet" - overwhelmed
3. Downloads multiple apps - too complex
4. Finds GlucoLens via Facebook ad
5. Takes first food photo - amazed by simplicity
6. Sees first prediction - gains confidence
7. Subscribes after 7-day trial

**Success Metrics:**
- Logs 2+ meals daily
- 60% achieve target glucose range
- HbA1c reduction of 0.5-1.0% in 3 months

---

### **3.2 Secondary: The Optimizer** (30% of users)

**Demographics:**
- Age: 25-45
- Income: $75K-200K+
- Location: Urban/tech hubs
- Tech comfort: High (early adopter)

**Psychographics:**
- No diabetes diagnosis (yet)
- Quantified self enthusiast
- Owns Apple Watch, Oura Ring, etc.
- Follows Peter Attia, Andrew Huberman
- Intermittent fasting, keto-curious
- Competitive about health metrics

**Pain Points:**
- "I want to prevent what happened to my dad"
- "I track everything but glucose"
- "Generic nutrition advice doesn't work for me"
- "I want to optimize for longevity"

**Jobs to be Done:**
- Prevent diabetes before it starts
- Optimize energy levels throughout day
- Personalize nutrition strategy
- Achieve metabolic flexibility

**User Journey:**
1. Hears about CGMs on podcast
2. Gets CGM prescription via telehealth
3. Frustrated by Dexcom app limitations
4. Discovers GlucoLens on Twitter/X
5. Loves the predictions feature
6. Becomes power user, shares insights
7. Advocates to friend group

**Success Metrics:**
- Uses advanced features (trends, correlations)
- Average glucose <100 mg/dL
- Glucose variability <15%
- 90% retention after 6 months

---

### **3.3 Tertiary: The Caregiver** (20% of users)

**Demographics:**
- Age: 35-55
- Income: $40K-80K
- Gender: 70% female
- Location: Anywhere
- Tech comfort: Moderate

**Psychographics:**
- Managing parent's or spouse's diabetes
- Stressed and overwhelmed
- Wants to help but doesn't know how
- Guilty about food choices
- Protective but frustrated

**Pain Points:**
- "Dad won't track his blood sugar"
- "Mom keeps eating things that spike her"
- "I cook but don't know what's safe"
- "The doctor visits are too short"

**Jobs to be Done:**
- Monitor loved one's glucose remotely
- Plan meals that won't cause spikes
- Reduce diabetes complications
- Peace of mind

**User Journey:**
1. Parent hospitalized for diabetes complication
2. Becomes primary caregiver
3. Researches diabetes management
4. Downloads GlucoLens for both
5. Uses family sharing features
6. Sees improvement in parent's control
7. Recommends to support group

**Success Metrics:**
- Both users active
- Meal planning features used weekly
- Reduced ER visits
- Improved family member's HbA1c

---

### **3.4 Quaternary: The T1D Warrior** (10% of users)

**Demographics:**
- Age: 15-35
- Income: Varies (often parents paying)
- Location: Global
- Tech comfort: Very high

**Psychographics:**
- Type 1 diabetes since childhood
- Expert at carb counting
- Frustrated by unpredictability
- Active in online communities
- Wants more automation

**Pain Points:**
- "Pizza always gets me 4 hours later"
- "Exercise makes everything unpredictable"
- "I'm tired of being a human pancreas"
- "Loop/AndroidAPS is too complex"

**Jobs to be Done:**
- Reduce cognitive burden
- Improve time in range to >70%
- Predict delayed spikes
- Share data with endo efficiently

**User Journey:**
1. Using CGM for years
2. Tries every diabetes app
3. Finds GlucoLens via Reddit r/diabetes_t1
4. Skeptical but tries free trial
5. Impressed by prediction accuracy
6. Integrates into daily routine
7. Shares with endo at next visit

**Success Metrics:**
- Time in range >70%
- Prediction accuracy >85%
- Reduced diabetes burnout scores
- Active in community features

---

## **4. PRODUCT STRATEGY**

### **4.1 Core Value Proposition**

**For people with diabetes or prediabetes**  
**Who need to understand how food affects their blood sugar**  
**GlucoLens is a mobile app**  
**That predicts glucose response from food photos**  
**Unlike traditional glucose trackers**  
**Our product learns your unique metabolic patterns**

### **4.2 Key Features (MVP)**

1. **Photo-First Food Logging**
   - One-tap camera access
   - AI identifies ingredients in <3 seconds
   - Manual adjustment if needed
   - Portion size estimation

2. **Smart Glucose Entry**
   - Large number pad (like Apple Health)
   - CGM auto-sync (Dexcom, Libre)
   - Apple Health integration
   - Reminder notifications

3. **Personalized Predictions**
   - "This meal will likely raise you to 165 mg/dL"
   - Confidence indicators
   - Time to peak estimates
   - Improvement suggestions

4. **Daily Insights**
   - "Breakfast spikes you 30% more than dinner"
   - "Adding protein reduces spikes by 25 mg/dL"
   - Pattern recognition
   - Weekly reports

5. **Simple Sharing**
   - Export for doctor visits
   - Family member access
   - Anonymous community comparisons

### **4.3 Feature Prioritization (MoSCoW)**

**Must Have (Week 1)**
- Food photo capture & analysis
- Manual glucose entry
- Basic prediction model
- Daily timeline view
- PWA functionality

**Should Have (Week 2)**
- Apple Health sync
- CGM integration
- Meal correlation
- Insight generation
- Onboarding flow

**Could Have (Week 3)**
- Advanced predictions
- Social features
- Meal templates
- Achievements
- Dark mode

**Won't Have (Future)**
- Insulin tracking
- Exercise correlation
- Medication reminders
- Telehealth integration
- AI meal planning

---

## **5. USER EXPERIENCE**

### **5.1 Design Principles**

1. **Mobile-First, Thumb-Friendly**
   - All actions reachable with one thumb
   - Minimum touch target: 44x44px
   - Bottom navigation
   - Gesture-based interactions

2. **Speed Obsession**
   - Food photo → result in <3 seconds
   - Glucose entry in 2 taps
   - Instant visual feedback
   - Predictive pre-loading

3. **Visual Over Text**
   - Charts instead of numbers
   - Colors for glucose ranges
   - Icons for meal types
   - Progress rings for goals

4. **Forgiveness & Recovery**
   - Undo for all actions
   - Edit past entries
   - Offline mode
   - Auto-save everything

### **5.2 Information Architecture**

```
GlucoLens/
├── Onboarding (First Use)
│   ├── Welcome
│   ├── Diabetes Type Selection
│   ├── Target Range Setup
│   ├── CGM Connection (Optional)
│   └── First Food Photo
├── Dashboard (Home)
│   ├── Current Glucose Display
│   ├── Quick Actions (Camera, Manual Entry)
│   ├── Today's Timeline
│   └── Latest Insight
├── Camera (Primary Action)
│   ├── Capture
│   ├── Review
│   └── Confirm Nutrition
├── History
│   ├── Calendar View
│   ├── List View
│   └── Search
├── Insights
│   ├── Daily Summary
│   ├── Weekly Patterns
│   └── Food Rankings
└── Settings
    ├── Profile
    ├── Integrations
    ├── Notifications
    └── Subscription
```

### **5.3 Key User Flows**

**Flow 1: First Food Entry**
1. Tap camera button (1 tap)
2. Point at meal, auto-captures (0 taps)
3. See detected nutrition (automatic)
4. Confirm or adjust (1 tap)
5. View prediction (automatic)
Total: 2 taps, <10 seconds

**Flow 2: Manual Glucose Entry**
1. Tap glucose button (1 tap)
2. Enter number on keypad (1-3 taps)
3. Confirm (1 tap)
Total: 3-5 taps, <5 seconds

**Flow 3: View Correlation**
1. Dashboard shows timeline (0 taps)
2. Tap meal to see glucose impact (1 tap)
3. Swipe for recommendations (gesture)
Total: 1 tap, <3 seconds

### **5.4 Visual Design System**

**Colors:**
```css
--glucose-low: #EF4444 (red, <70)
--glucose-normal: #10B981 (green, 70-140)
--glucose-elevated: #F59E0B (amber, 140-180)
--glucose-high: #EF4444 (red, >180)
--primary: #3B82F6 (blue)
--background: #FFFFFF
--text: #1F2937
```

**Typography:**
- Headers: SF Pro Display / Inter Bold
- Body: SF Pro Text / Inter Regular
- Numbers: SF Mono / Roboto Mono
- Minimum size: 16px

**Components:**
- Cards with subtle shadows
- Full-width buttons
- Floating action button for camera
- Pull-to-refresh
- Skeleton screens while loading

---

## **6. TECHNICAL REQUIREMENTS**

### **6.1 Architecture**

```
Frontend:
├── Next.js 14 (App Router)
├── React 18
├── TypeScript
├── Tailwind CSS
├── PWA (Workbox)
└── Framer Motion

Backend:
├── Next.js API Routes
├── Supabase (Auth + Database)
├── Prisma ORM
├── Edge Functions
└── Webhooks

AI/ML:
├── Google Gemini 2.5 Flash (Food Analysis)
├── TensorFlow.js (Predictions)
├── Python microservice (Training)
└── Edge caching

Integrations:
├── Apple HealthKit
├── Google Fit
├── Dexcom API
├── FreeStyle LibreLink
└── Stripe (Payments)
```

### **6.2 Performance Requirements**

- **Page Load:** <1 second (LCP)
- **Food Analysis:** <3 seconds
- **Glucose Entry:** <100ms response
- **Offline Support:** Full read, queued writes
- **Battery Usage:** <5% daily
- **Storage:** <50MB app, <100MB data

### **6.3 Security & Compliance**

- **Encryption:** AES-256 at rest, TLS 1.3 in transit
- **Authentication:** Supabase Auth with MFA
- **HIPAA:** BAA with Supabase, audit logging
- **GDPR:** Data export, right to deletion
- **SOC 2:** Type I certification planned
- **Medical Device:** Non-SaMD (no diagnosis)

### **6.4 Database Schema (Simplified)**

```sql
6 Core Tables:
- users (Supabase Auth)
- persons (profiles)
- food_entries
- glucose_readings  
- predictions
- insights

All with RLS policies
All with audit timestamps
Optimized indexes for common queries
```

---

## **7. BUSINESS MODEL**

### **7.1 Pricing Tiers**

**Free Forever**
- 3 food photos/day
- Manual glucose entry
- Basic predictions
- 7-day history
- Purpose: User acquisition

**Premium ($9.99/month)**
- Unlimited food photos
- CGM integration
- Advanced predictions
- Full history
- Insights & patterns
- Export reports
- Purpose: Core monetization

**Family ($14.99/month)**
- Up to 4 accounts
- Shared meal database
- Caregiver dashboard
- Purpose: Increase LTV

**Pro ($29.99/month)**
- API access
- Raw data export
- Custom reports
- Priority support
- Purpose: Power users

### **7.2 Revenue Projections**

**Year 1 (2025)**
- 10,000 users by EOY
- 15% paid conversion
- $15K MRR exit rate
- $100K total revenue

**Year 2 (2026)**
- 100,000 users
- 20% paid conversion  
- $200K MRR exit rate
- $1.5M ARR

**Year 3 (2027)**
- 500,000 users
- 25% paid conversion
- $1.25M MRR exit rate
- $10M ARR

### **7.3 Unit Economics**

**Customer Acquisition Cost (CAC)**
- Paid ads: $30
- Organic: $5
- Blended: $15

**Lifetime Value (LTV)**
- ARPU: $12/month
- Churn: 5% monthly
- LTV: $240
- LTV/CAC: 16x

**Gross Margins**
- Revenue: 100%
- Gemini API: -$0.001/photo
- Hosting: -$0.50/user/month
- Margin: 95%+

---

## **8. GO-TO-MARKET STRATEGY**

### **8.1 Launch Strategy**

**Phase 1: Beta (Weeks 1-4)**
- 100 invited users
- Daily iteration
- Product-market fit validation
- NPS >50 goal

**Phase 2: Soft Launch (Months 2-3)**
- 1,000 users
- Organic acquisition only
- Community building
- Retention focus

**Phase 3: Growth (Months 4-6)**
- Paid acquisition starts
- Influencer partnerships
- SEO content marketing
- App store optimization

### **8.2 Distribution Channels**

1. **Organic (60%)**
   - App Store optimization
   - SEO blog content
   - Reddit communities
   - Facebook groups
   - Word of mouth

2. **Paid (30%)**
   - Facebook/Instagram ads
   - Google UAC
   - Apple Search Ads
   - Retargeting

3. **Partnerships (10%)**
   - Endocrinologists
   - Diabetes educators
   - CGM manufacturers
   - Telehealth platforms

### **8.3 Competitive Positioning**

| Feature | GlucoLens | MySugr | Glucose Buddy | Levels |
|---------|-----------|---------|---------------|---------|
| Photo food logging | ✅ | ❌ | ❌ | ❌ |
| AI predictions | ✅ | ❌ | ❌ | Partial |
| Price | $9.99 | Free/$2.99 | Free/$4.99 | $399/mo |
| CGM required | No | No | No | Yes |
| Personalized ML | ✅ | ❌ | ❌ | ✅ |

**Our Moat:**
1. Photo-first UX (Instagram-like)
2. Personalized prediction models
3. Price point (10% of Levels)
4. Network effects (meal database)

---

## **9. SUCCESS METRICS**

### **9.1 North Star Metric**
**Daily Active Users logging at least one meal**

### **9.2 Key Metrics**

**Acquisition**
- Downloads: 1,000/week by Month 3
- CAC <$20
- Organic %: >60%

**Activation**  
- Complete onboarding: >80%
- First food photo: >70%
- Connect CGM/Health: >40%

**Retention**
- D1: >60%
- D7: >40%
- D30: >25%
- M6: >15%

**Revenue**
- Trial → Paid: >20%
- MRR growth: >20% MoM
- Churn: <5% monthly
- LTV/CAC: >3x

**Engagement**
- Sessions/day: >3
- Foods logged/day: >2
- Predictions viewed: >80%
- Time in app: >5 min/day

### **9.3 Clinical Outcomes**
- Time in range improvement: +10%
- HbA1c reduction: -0.5%
- Hypo events: -30%
- User reported confidence: >8/10

---

## **10. RISKS & MITIGATIONS**

### **10.1 Technical Risks**

**Risk:** Food recognition accuracy <80%
**Mitigation:** Manual correction UI, user feedback loop

**Risk:** Prediction models wrong
**Mitigation:** Show confidence levels, continuous learning

**Risk:** API costs too high
**Mitigation:** Caching, batch processing, usage limits

### **10.2 Market Risks**

**Risk:** Apple/Google enter market
**Mitigation:** Move faster, deeper personalization

**Risk:** CGM adoption slows
**Mitigation:** Excel at manual entry experience

**Risk:** Regulation as medical device
**Mitigation:** Stay prediction-only, no diagnosis

### **10.3 Business Risks**

**Risk:** Can't raise funding
**Mitigation:** Bootstrap-friendly unit economics

**Risk:** High churn rate
**Mitigation:** Daily habit formation, insights value

**Risk:** Competition from Dexcom/Abbott
**Mitigation:** Partner rather than compete

---

## **11. IMPLEMENTATION TIMELINE**

### **Week 1: Foundation**
- [ ] Complete codebase cleanup
- [ ] Database migration
- [ ] New routing structure
- [ ] PWA setup
- [ ] Basic UI components

### **Week 2: Core Features**
- [ ] Food camera & AI
- [ ] Glucose entry
- [ ] Timeline view
- [ ] Basic predictions
- [ ] Apple Health sync

### **Week 3: Polish & Launch**
- [ ] Insights engine
- [ ] Onboarding flow
- [ ] Premium features
- [ ] App store prep
- [ ] Beta user recruitment

### **Month 2-3: Growth**
- [ ] Native apps (React Native)
- [ ] CGM integrations
- [ ] Advanced ML models
- [ ] Community features
- [ ] Paid acquisition

---

## **12. TEAM & RESOURCES**

### **Current Team**
- Founder/CEO (Product & Business)
- Technical execution via Claude Code
- Part-time designer (contract)
- Clinical advisor (endocrinologist)

### **Needed Hires (by Month 6)**
- Full-stack engineer
- ML engineer  
- Growth marketer
- Customer success
- iOS developer

### **Funding Requirements**
- **Seed:** $500K (12 months runway)
- **Use of funds:**
  - Product development: 40%
  - Marketing: 30%
  - Team: 20%
  - Infrastructure: 10%

---

## **13. APPENDICES**

### **A. User Personas Deep Dive**
[Detailed personas with journey maps]

### **B. Technical Architecture**
[System design documents]

### **C. Financial Model**
[5-year P&L projection]

### **D. Regulatory Pathway**
[FDA/CE mark considerations]

### **E. Clinical Evidence**
[Studies supporting approach]

---

## **CRITICAL SUCCESS FACTORS**

**The pivot succeeds when:**
1. ✅ 100 daily active users
2. ✅ 70% log food daily
3. ✅ 20% convert to paid
4. ✅ NPS >50
5. ✅ Prediction accuracy >80%
6. ✅ <5% monthly churn
7. ✅ CAC <$20
8. ✅ Time in range improves >10%

---

## **FINAL INSTRUCTIONS FOR CLAUDE CODE**

**Your Mission:**
Transform EverMed into GlucoLens by executing this PRD with extreme focus. Every line of code, every pixel, every database query should serve one purpose: helping people understand how food affects their blood sugar.

**Delete ruthlessly.** If it doesn't serve the core mission, remove it.

**Build obsessively.** Make it so simple that a 65-year-old with diabetes can use it one-handed while eating.

**Ship immediately.** We have a 6-month window before Big Tech notices this opportunity.

**Remember:** We're not building a health app. We're building a daily habit that happens to save lives.

---

**END OF PRD**

*"Make metabolic health as simple as taking a photo."*
