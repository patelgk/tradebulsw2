# Test Viewport Height Fix

## Quick Test (2 minutes)

### Step 1: Open Browser DevTools
- Press `F12`
- Go to **Console** tab

### Step 2: Refresh Page & Open Option Chain
- Refresh the page
- Navigate to Trade section
- Click to open option chain
- Wait for data to load

### Step 3: Check Console for These Logs

**Look for (in order)**:

```
[OptionChain] VIEWPORT MEASUREMENT DEBUG {
  clientHeight: ___,
  offsetHeight: ___,
  getBoundingClientRect.height: ___,
  scrollHeight: ___
}
```

**Expected values**:
- All four heights should be **similar** (e.g., 550-600px)
- **NOT** 17972px
- scrollHeight can be larger (total content)

---

**Then look for**:

```
[OptionChain] Container measured - VALID height: 550
```

**Or ERROR**:
```
[OptionChain] Container measurement FAILED - invalid height: 17972
```

---

**Then look for**:

```
[OptionChain] ATM CENTER DEBUG {
  atmIndex: 119,
  atmStrike: 24450,
  rowHeight: 48,
  viewportHeight: 550,
  targetScroll: 4752,
  maxScroll: 11064,
  finalScroll: 4752,
  totalRows: 231
}
```

**Expected**:
- `viewportHeight: ~550` (not 17972)
- `targetScroll: ~4752` (non-zero)
- `atmStrike: ~24450` (close to spot price)

### Step 4: Verify Visual Result

**Expected**:
- ✅ Initial view shows strikes around ATM (24450), NOT 18500
- ✅ Smooth animation scrolls to center on ATM
- ✅ All 231 rows are visible when scrolling
- ✅ No rendering issues

## If Fix Works ✅

```
✅ viewportHeight = 550 (correct)
✅ targetScroll = 4752 (non-zero)
✅ ATM strike visible in initial view
✅ Smooth centering animation
✅ All 231 rows rendering
```

## If Fix Didn't Work ❌

**If you see**:
```
[OptionChain] Container measurement FAILED - invalid height: 17972
```

Then:
1. Check the measurement values in `VIEWPORT MEASUREMENT DEBUG`
2. Report which height is 17972
3. Check if scrollRef.current is correctly assigned

**If viewportHeight is still wrong**:
1. The element might not be in DOM when measured
2. Check element in DevTools inspector - is the scroll container visible?
3. Try scrolling the page - measurement might trigger on resize

---

## Report These Values

When you test, copy-paste from console:

```javascript
// From VIEWPORT MEASUREMENT DEBUG
clientHeight: ?
offsetHeight: ?
getBoundingClientRect.height: ?
scrollHeight: ?

// From Container measured
viewportHeight: ?

// From ATM CENTER DEBUG
targetScroll: ?
atmIndex: ?
atmStrike: ?
```

---

**Build Status**: ✅ Ready to test
