# **Metabolic Insights — Product Requirements Document**

**Version:** 1.0 • October 10, 2025  
**Product Track:** Premium Feature Addition to EverMed.ai  
**Regulatory Classification:** Wellness/Lifestyle (Non-SaMD initially, with pathway to Class II SaMD)  
**Status:** Proposed

---

## **Executive Summary**

Metabolic Insights is a premium feature track within EverMed.ai that enables users to track food intake through photos, monitor blood sugar responses, and receive personalized predictions about how specific foods affect their glucose levels. By combining visual food logging with continuous glucose monitor (CGM) data or fingerstick readings, the system learns individual metabolic patterns to provide increasingly accurate predictions and actionable insights.

**Key Innovation:** Personalized ML models that learn each user's unique glycemic response patterns, integrated within their existing health vault for comprehensive metabolic health management.

---

## **1. Problem Statement**

### Current Pain Points
- **Disconnected tracking:** Food logs and glucose readings exist in separate apps
- **Generic predictions:** Current apps use population averages, not personalized responses
- **Manual logging friction:** Text-based food entry is tedious and often abandoned
- **Lack of context:** Users don't understand why their blood sugar spikes with certain foods
- **No learning:** Apps don't improve predictions based on individual patterns

### Market Opportunity
- **96 million** US adults have pre-diabetes (38% of adult population)
- **37 million** have diabetes (11.3% of population)
- **$327 billion** annual diabetes costs in the US
- CGM market growing 15% annually, reaching mainstream adoption
- Rising health consciousness post-COVID driving preventive care adoption

---

## **2. Solution Overview**

### Core Concept
A visual food diary that correlates meals with blood sugar responses, learning from each user's data to provide increasingly personalized predictions and recommendations.

### Key Differentiators
1. **Photo-first logging** - Snap, eat, learn (< 5 seconds to log)
2. **Individual response learning** - Your body, not population averages
3. **Integrated health context** - Connects with medications, conditions, lab history
4. **Predictive insights** - "This meal will likely spike you to ~180 mg/dL in 45 minutes"
5. **Actionable recommendations** - "Try adding protein to reduce spike by ~30%"

---

## **3. User Personas**

### Primary: The Newly Diagnosed
- **Demographics:** 45-65 years old, recently diagnosed with Type 2 diabetes or pre-diabetes
- **Tech comfort:** Moderate (uses smartphone daily, some health apps)
- **Goals:** Understand what foods to avoid, maintain stable blood sugar
- **Pain points:** Overwhelmed by dietary changes, confused by conflicting advice

### Secondary: The Optimizer
- **Demographics:** 25-45 years old, health-conscious, may wear CGM without diagnosis
- **Tech comfort:** High (multiple health trackers, quantified self enthusiast)
- **Goals:** Optimize energy levels, prevent metabolic disease
- **Pain points:** Wants personalized data, not generic recommendations

### Tertiary: The Caregiver
- **Demographics:** Managing diabetic family member's health
- **Goals:** Help loved one maintain healthy blood sugar levels
- **Pain points:** Need simple tools for non-tech-savvy family member

---

## **4. User Journey**

### Onboarding Flow
1. **Health Profile Setup**
   - Import existing conditions from vault (diabetes type, medications)
   - Enter body metrics (weight, height, activity level)
   - Connect glucose monitor (CGM via HealthKit/Google Fit or manual entry)

2. **Baseline Establishment** (Days 1-7)
   - Guided first meal logging
   - Education snippets about glucose response
   - Initial correlation demonstrations

### Daily Usage Flow
1. **Before Eating** (5 seconds)
   - Open camera from home screen widget
   - Snap photo of meal
   - Optional: Quick note (e.g., "stressed", "post-workout")

2. **Smart Analysis** (Automatic)
   - AI identifies ingredients and portions
   - Estimates carbs, protein, fat, fiber
   - Predicts glucose curve based on user's history
   - Suggests modifications if spike predicted

3. **Post-Meal** (Automatic)
   - Correlates with CGM data (or prompts for fingerstick)
   - Updates personal response model
   - Notifies if prediction was off (learning opportunity)

4. **Daily Review** (2 minutes)
   - Visual timeline of meals and glucose
   - Insights: "Your morning oatmeal consistently spikes you"
   - Achievements: "3 days of staying in range!"

---

## **5. Feature Specifications**

### 5.1 Food Recognition & Logging

#### Photo Analysis Engine
- **Input:** Single photo of meal/food
- **Processing:**
  - Segment individual food items
  - Identify ingredients with confidence scores
  - Estimate portions using plate/utensil references
  - Handle mixed dishes and restaurant meals
- **Output:** Structured meal data with nutritional breakdown

#### Manual Refinement
- Tap to correct misidentified items
- Adjust portion sizes with visual guides
- Add hidden ingredients (oils, sauces)
- Save frequent meals as templates

### 5.2 Glucose Data Integration

#### Data Sources (Priority Order)
1. **Continuous Glucose Monitors (CGM)**
   - Dexcom G7 via HealthKit
   - FreeStyle Libre via LibreLinkUp
   - Generic CGM via HealthKit/Google Fit

2. **Fingerstick Meters**
   - Manual entry with smart prompts
   - Photo capture of meter reading
   - Bluetooth meters via HealthKit

3. **Lab Results**
   - HbA1c from document vault
   - Fasting glucose from recent labs

#### Correlation Engine
- Time-align meals with glucose curves
- Identify peak response times (typically 30-90 min)
- Calculate area under curve (AUC)
- Tag anomalies (exercise, stress, illness)

### 5.3 Personalized Prediction Model

#### Individual Response Learning
- **Features tracked per user:**
  - Glycemic index of specific foods
  - Response to macronutrient combinations
  - Time-of-day sensitivity patterns
  - Exercise impact on glucose
  - Medication timing effects
  - Stress/sleep correlation

#### Prediction Capabilities
- **Pre-meal:** "This will likely spike you to ~165 mg/dL"
- **Real-time:** "Your glucose should peak in ~20 minutes"
- **Comparative:** "30% less spike than your usual breakfast"
- **Recommendations:** "Add 10g protein to reduce spike by ~25mg/dL"

### 5.4 Insights & Recommendations

#### Daily Insights
- Best and worst meals for glucose control
- Time-in-range percentage
- Pattern recognition ("Morning carbs hit harder")

#### Weekly Reports
- Trending improvements or concerns
- Food swaps that worked
- Correlation discoveries (sleep quality → morning glucose)

#### Smart Recommendations
- Meal timing optimization
- Food pairing suggestions
- Exercise timing for glucose control
- Personalized "safe foods" list

### 5.5 Social & Gamification

#### Achievement System
- Streaks (days in range)
- Learning milestones (10 meals tracked)
- Improvement badges (reduced average spike)

#### Sharing (Optional)
- Share successful meals with community
- Anonymous pattern sharing for research
- Family sharing for caregiver support

---

## **6. Technical Architecture**

### 6.1 Data Model Extensions

```typescript
// New entities for EverMed database
interface FoodEntry {
  id: string;
  userId: string;
  personId: string;
  timestamp: Date;
  photos: FoodPhoto[];
  ingredients: Ingredient[];
  nutrition: NutritionFacts;
  predictedGlucosePeak: number;
  actualGlucosePeak?: number;
  notes?: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  context: MealContext;
}

interface GlucoseReading {
  id: string;
  userId: string;
  personId: string;
  timestamp: Date;
  value: number; // mg/dL
  source: 'cgm' | 'fingerstick' | 'lab';
  deviceId?: string;
  foodEntryId?: string; // correlation
}

interface PersonalResponseModel {
  userId: string;
  personId: string;
  foodResponses: Map<FoodFingerprint, GlycemicResponse>;
  timeOfDayFactors: number[]; // 24 hours
  insulinSensitivityFactor?: number;
  lastUpdated: Date;
}
```

### 6.2 AI/ML Pipeline

#### Food Recognition
- **Primary:** Vision API (Google Cloud Vision / AWS Rekognition)
- **Fallback:** On-device CoreML/TensorFlow Lite models
- **Training data:** Food-101, Nutrition5k, custom labeled dataset

#### Glucose Prediction
- **Architecture:** Individual LSTM models per user
- **Features:** Meal composition, time of day, recent glucose, activity
- **Retraining:** Nightly batch per user with new data
- **Cold start:** Population model → Personalized after 20 meals

### 6.3 Privacy & Security

#### Data Handling
- All food photos encrypted at rest
- Option to auto-delete photos after processing
- Glucose data never leaves device without encryption
- Federated learning for model improvements (no raw data sharing)

#### Compliance Considerations
- HIPAA compliance maintained
- GDPR right to deletion includes ML model reset
- Explicit consent for prediction features
- Clear data usage explanations

---

## **7. Monetization Strategy**

### Pricing Tiers

#### Free Tier (Existing EverMed users)
- 5 meal logs per week
- Basic food recognition
- Manual glucose entry
- Weekly summary

#### Premium ($9.99/month)
- Unlimited meal logging
- Advanced food recognition
- CGM integration
- Personalized predictions
- Daily insights & recommendations
- Export capabilities

#### Family Plan ($14.99/month)
- Up to 4 family members
- Caregiver dashboard
- Shared meal templates
- Group challenges

### Revenue Projections
- **Year 1:** 5% of existing users convert → $50K MRR
- **Year 2:** 15% conversion + new user acquisition → $200K MRR
- **Year 3:** 25% conversion + partnerships → $500K MRR

---

## **8. Success Metrics**

### Engagement Metrics
- **Daily Active Users:** Target 60% of subscribers
- **Meals logged per week:** Target 15+ per active user
- **Prediction accuracy:** <15 mg/dL average error after 30 days

### Health Outcomes
- **Time in range improvement:** +10% after 90 days
- **HbA1c reduction:** -0.5% average after 6 months
- **User reported energy:** 70% report improvement

### Business Metrics
- **Free to paid conversion:** 15% within 30 days
- **Monthly churn:** <5%
- **LTV:CAC ratio:** >3:1

---

## **9. Regulatory Pathway**

### Phase 1: Wellness App (Months 1-6)
- No medical claims
- Focus on food logging and correlation
- General wellness claims only

### Phase 2: FDA Registration (Months 7-12)
- Register as Class II medical device software
- 510(k) submission for glucose prediction
- Predicate: MySugr, Glucose Buddy

### Phase 3: Clinical Validation (Months 13-18)
- Partner with academic medical center
- 500-patient validation study
- Publish peer-reviewed results

---

## **10. Risk Analysis**

### Technical Risks
- **Food recognition accuracy** → Mitigation: Easy manual correction UI
- **Prediction model errors** → Mitigation: Conservative confidence intervals
- **CGM integration complexity** → Mitigation: Start with HealthKit/Google Fit

### Market Risks
- **CGM adoption slower than expected** → Mitigation: Excellent fingerstick UX
- **Competition from big tech** → Mitigation: Deep integration with health vault
- **User retention** → Mitigation: Strong habit formation in first 7 days

### Regulatory Risks
- **FDA classification changes** → Mitigation: Maintain non-SaMD option
- **Data privacy regulations** → Mitigation: Privacy-first architecture

---

## **11. Go-to-Market Strategy**

### Launch Sequence

#### Month 1-2: Alpha (Internal + 50 beta users)
- Core team + friends/family
- Daily iteration on food recognition
- Establish baseline accuracy metrics

#### Month 3-4: Closed Beta (500 users)
- Existing EverMed premium users
- Require 30-day commitment
- Weekly feedback sessions

#### Month 5-6: Open Beta (5,000 users)
- Public launch as "experimental feature"
- 50% discount for early adopters
- Press embargo until Month 6

#### Month 7+: General Availability
- Full launch with premium pricing
- Partnership announcements
- Clinical study initiation

### Marketing Strategy
- **Content:** "What I learned from 30 days of glucose tracking"
- **Influencers:** Partner with diabetes educators, nutritionists
- **Medical:** Present at American Diabetes Association conference
- **Digital:** Google Ads for "continuous glucose monitor apps"

---

## **12. Development Roadmap**

### MVP (3 months)
- ✅ Photo capture and food recognition
- ✅ Basic nutritional estimation
- ✅ Manual glucose entry
- ✅ Simple correlation display
- ✅ Daily summary

### Beta (6 months)
- ✅ Everything in MVP
- ✅ CGM integration via HealthKit
- ✅ Personal prediction model (basic)
- ✅ Weekly insights
- ✅ Meal templates

### V1.0 (9 months)
- ✅ Everything in Beta
- ✅ Advanced ML predictions
- ✅ Social features
- ✅ Caregiver mode
- ✅ Clinical report export

### Future Versions
- Insulin dose recommendations (requires FDA approval)
- Medication timing optimization
- Restaurant menu integration
- Voice logging
- Macro/micro nutrient tracking

---

## **13. Team & Resources**

### Required Hires
1. **ML Engineer** - Food recognition & glucose prediction models
2. **iOS Health Kit Specialist** - CGM integrations
3. **Clinical Advisor** - Endocrinologist for medical accuracy
4. **Nutritionist** - Food database and recommendations

### Development Effort
- **Engineering:** 6 developers × 6 months
- **Design:** 2 designers × 3 months
- **Data Science:** 2 scientists × 9 months
- **Clinical:** 1 advisor × ongoing

### Budget Estimate
- **Development:** $600K (Year 1)
- **Infrastructure:** $50K (Year 1)
- **Clinical validation:** $200K
- **Marketing:** $150K
- **Total Year 1:** $1M

---

## **14. Integration with Core EverMed**

### Synergies
- Medications from vault affect glucose predictions
- Lab results provide baseline metabolic health
- Appointment packs include glucose trends
- Explain feature covers glucose reports

### Data Flow
- Food entries → Document vault (as structured data)
- CGM data → Observations entity
- Predictions → New insights section
- Reports → Shareable via Appointment Packs

### UI/UX Integration
- New tab in main navigation: "Metabolic"
- Quick action card: "Log meal"
- Widget for home screen camera access
- Glucose timeline in Track section

---

## **15. Competitive Analysis**

### Direct Competitors

#### MySugr (Roche)
- **Strengths:** Great UX, strong brand
- **Weaknesses:** No photo logging, generic predictions
- **Our advantage:** Visual-first, personalized ML

#### Glucose Buddy
- **Strengths:** Free, simple
- **Weaknesses:** Manual everything, no intelligence
- **Our advantage:** Automation, predictions

#### Levels
- **Strengths:** CGM-first, metabolic health focus
- **Weaknesses:** Expensive ($399/mo), requires CGM
- **Our advantage:** Works without CGM, integrated health context

### Indirect Competitors
- MyFitnessPal (nutrition tracking)
- Apple Health (glucose logging)
- Dexcom Clarity (CGM analysis)

---

## **16. Key Decisions Required**

### Business Decisions
1. **Separate app or integrated feature?** → Recommendation: Integrated
2. **Premium only or freemium?** → Recommendation: Freemium with strong premium value
3. **FDA pathway timing?** → Recommendation: Launch as wellness, pursue FDA in parallel

### Technical Decisions
1. **Build vs buy food recognition?** → Recommendation: Buy initially, build over time
2. **Individual vs population models?** → Recommendation: Both, start population → personalize
3. **On-device vs cloud ML?** → Recommendation: Hybrid for privacy/performance

### Product Decisions
1. **Require CGM or support manual?** → Recommendation: Support both, optimize for CGM
2. **Social features at launch?** → Recommendation: No, add in V2
3. **Gamification depth?** → Recommendation: Light touch, avoid trivializing health

---

## **17. Success Criteria for Launch**

### Must Have (Launch Blockers)
- Food recognition accuracy >80%
- Glucose correlation within 5 minutes
- Prediction model trained on 10,000+ meals
- HIPAA compliance maintained
- Sub-2-second photo → result time

### Should Have
- CGM integration with top 2 brands
- Weekly insight generation
- Family member support
- Export for clinicians

### Nice to Have
- Voice input
- Barcode scanning
- Restaurant database
- Macro tracking

---

## **18. Appendix**

### A. Sample Prediction Outputs
```
Morning prediction: "Your usual breakfast of oatmeal with banana 
typically raises your glucose by 65 mg/dL, peaking at 45 minutes."

Real-time: "Based on the last 30 minutes, you're likely to reach 
165 mg/dL in about 15 minutes, then return to baseline by 11:30am."

Recommendation: "Try adding 2 tbsp of almond butter to slow the 
glucose rise by approximately 30%."
```

### B. Research References
- [Zeevi et al., 2015](https://www.cell.com/cell/fulltext/S0092-8674(15)01481-6) - Personalized Nutrition by Prediction of Glycemic Responses
- [Hall et al., 2018](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.2005143) - Glucotypes reveal new patterns of glucose dysregulation
- [Berry et al., 2020](https://www.nature.com/articles/s41591-020-0934-0) - Human postprandial responses to food and potential for precision nutrition

### C. Technical APIs Required
- Google Cloud Vision API (food recognition)
- HealthKit (iOS CGM data)
- Google Fit (Android CGM data)
- Nutritionix or Edamam (nutrition database)
- TensorFlow Serving (ML model deployment)

---

**END OF DOCUMENT**

*This PRD serves as the source of truth for the Metabolic Insights feature development. Updates require product, engineering, and clinical approval.*