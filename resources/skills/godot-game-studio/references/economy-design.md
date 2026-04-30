# Game Economy Design

## Economy Types

### Single Currency

Simplest model. One currency (gold, coins, credits) for all transactions.

- Best for: simple games, casual games, early prototypes.
- Risk: inflation if sources outpace sinks.

### Multi-Currency

Different currencies for different systems (gold for shops, gems for premium, reputation for factions).

- Best for: RPGs, strategy games, games with progression layers.
- Risk: conversion rates create exploits if not balanced.

### Resource-Based

Players gather and manage multiple resources (wood, stone, food, energy).

- Best for: survival, city-builders, crafting games.
- Risk: resource bottlenecks kill pacing.

## Balance Framework

### Sources and Sinks

Every economy item needs documented sources (how it enters) and sinks (how it exits):

```
Gold Sources:
├── Quest rewards: 50-500 per quest
├── Monster drops: 5-50 per kill
├── Selling items: 10-80% of buy price
└── Daily login: 100/day

Gold Sinks:
├── Shop purchases: weapons, armor, consumables
├── Crafting costs: 20-200 per recipe
├── Fast travel: 10-50 per trip
├── Repair costs: 15-30% of item value
└── Auction house tax: 5%
```

### Income Curves

```
Player Level | Hourly Income | Key Purchases | Balance Target
1-5          | 100-200       | Basic weapon   | Slight surplus
6-10         | 300-500       | Armor set      | Break even
11-20        | 500-1000      | Specialty gear | Slight deficit (drives engagement)
21-30        | 1000-2000     | Endgame items  | Controlled deficit
```

### Price Scaling

```gdscript
class_name EconomyData extends Resource

@export var base_item_price: int = 100
@export var price_growth_rate: float = 1.15  # 15% increase per tier
@export var sell_ratio: float = 0.4  # Sell price = 40% of buy price
@export var repair_ratio: float = 0.2

func item_price_at_tier(tier: int) -> int:
    return int(base_item_price * pow(price_growth_rate, tier))

func sell_price(buy_price: int) -> int:
    return int(buy_price * sell_ratio)
```

## Loot Tables

```gdscript
class_name LootTable extends Resource

@export var entries: Array[LootEntry]

func roll() -> Array[ItemDrop]:
    var results: Array[ItemDrop] = []
    for entry in entries:
        if randf() <= entry.drop_chance:
            var quantity := randi_range(entry.min_quantity, entry.max_quantity)
            results.append(ItemDrop.new(entry.item, quantity))
    return results

class_name LootEntry extends Resource

@export var item: ItemData
@export var drop_chance: float = 0.5  # 0.0 to 1.0
@export var min_quantity: int = 1
@export var max_quantity: int = 1
@export var weight: float = 1.0  # For weighted random selection
```

### Rarity Tiers

| Tier | Drop Rate | Power Level | Color Code |
|------|-----------|-------------|------------|
| Common | 60-80% | Baseline | White |
| Uncommon | 15-25% | +10-20% | Green |
| Rare | 5-10% | +30-50% | Blue |
| Epic | 1-3% | +60-100% | Purple |
| Legendary | 0.1-0.5% | +100-200% | Gold |

## Anti-Inflation Measures

1. **Gold sinks scale with income** — repair costs, upgrade costs, taxes.
2. **Diminishing returns** — repeated farming yields less.
3. **Item durability** — equipment degrades and needs repair/replacement.
4. **Time gates** — daily limits on high-value activities.
5. **Bind on pickup/equip** — prevents infinite trading loops.

## Testing Economy Balance

- Simulate 100 hours of gameplay mathematically.
- Track income/expense ratios per hour at each progression stage.
- Identify when players can afford key items vs. when they're intended to.
- Playtest with real users — do they feel rewarded or starved?
- Monitor: if players hoard one resource, its sinks are too weak.
