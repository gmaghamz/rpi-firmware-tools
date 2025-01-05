# rpi-firmware-tools

This package provides a set of utility functions that enable easy modification of raspberry pi firmware files such as:

- /boot/firmware/config.txt
- /boot/firmware/cmdline.txt

Typically these files are modified manually by connecting to the PI and using a text editor on the system. That process becomes
inefficient when configuring multiple PIs.

## Notes

- The config.txt format seems similar to .ini format but there are subtle differences.
- A feature of this package is whitespace, line order, and comments are preserved when parsing and stringifying files in order to keep manual editing easy and convenient.
- Use at your own risk. Always backup files before modifying and keep a recovery sdcard to boot from just in case.

## Installation

```
npm i rpi-firmware-tools
```

## Usage

### Modifying /boot/firmware/config.txt

Consider a config.txt file such as:

```ini
# For more options and information see
# http://rptl.io/configtxt
# Some settings may impact device functionality. See link above for details

# Uncomment some or all of these to enable the optional hardware interfaces
#dtparam=i2c_arm=on
#dtparam=i2s=on
#dtparam=spi=on

# Enable audio (loads snd_bcm2835)
dtparam=audio=on

# Additional overlays and parameters are documented
# /boot/firmware/overlays/README

# Automatically load overlays for detected cameras
camera_auto_detect=1

# Automatically load overlays for detected DSI displays
display_auto_detect=1

# Automatically load initramfs files, if found
auto_initramfs=1

# Enable DRM VC4 V3D driver
dtoverlay=vc4-kms-v3d
max_framebuffers=2

# Don't have the firmware create an initial video= setting in cmdline.txt.
# Use the kernel's default instead.
disable_fw_kms_setup=1

# Run in 64-bit mode
arm_64bit=1

# Disable compensation for displays with overscan
disable_overscan=1

# Run as fast as firmware / board allows
arm_boost=1

[cm4]
# Enable host mode on the 2711 built-in XHCI USB controller.
# This line should be removed if the legacy DWC2 controller is required
# (e.g. for USB device mode) or if USB support is not required.
otg_mode=1

[cm5]
dtoverlay=dwc2,dr_mode=host

[all]
```

You can read, update, and delete contents like this ( Typescript ):

```typescript
import {
  configParse,
  configStringify,
  CommentConfigLine,
  PropertyConfigLine,
  isCommentConfigLine,
  isPropertyConfigLine,
} from "rpi-firmware-tools";

// Connect to a rpi to read the file.
// This next line is pseudocode. Reading from or writing to the rpi is outside the scope of this package.
const fileContents = await sshReadFile("pi@raspberrypi.local", "/boot/firmware/config.txt", { encoding: "utf-8" });

const firmwareConfig = configParse(fileContents);

// Add property under the `all` filter.
firmwareConfig.all.push(
  {
    kind: "comment",
    text: "# Enable PCI Express 3",
  } as CommentConfigLine,
  {
    kind: "property",
    property: "dtparam", // setting props property and value only helps to find this line when searching.
    value: "pciex1_gen=3",
    text: "dtparam=pciex1_gen=3", // the text prop is what will be used when stringifying the config.
  } as PropertyConfigLine,
);

//  Update an existing global property
const cameraAutoDetect = firmwareConfig.__global.find((configLine) => {
  return isPropertyConfigLine(configLine) && configLine.property === "camera_auto_detect";
}) as PropertyConfigLine;

if (cameraAutoDetect) {
  // found the property.
  cameraAutoDetect.value = "0";
  cameraAutoDetect.text = `${cameraAutoDetect.property}=${cameraAutoDetect.value}`;
} else {
  // did not find the property.
  // do something else.
}

// Delete a config line. for example a comment
firmwareConfig.cm4 = firmwareConfig.cm4.filter((configLine) => {
  return !(
    isCommentConfigLine(configLine) &&
    configLine.text === "# This line should be removed if the legacy DWC2 controller is required"
  );
});

// Bonus example: Comment out an existing property.
const arm64bitPropIndex = firmwareConfig.__global.findIndex((configLine) => {
  return isPropertyConfigLine(configLine) && configLine.property === "arm_64bit";
});

if (arm64bitPropIndex !== -1) {
  // property was found.
  const arm64bitProp = firmwareConfig.__global[arm64bitPropIndex] as PropertyConfigLine;
  firmwareConfig.__global[arm64bitPropIndex] = {
    kind: "comment",
    text: `# ${arm64bitProp.text}`,
  } as CommentConfigLine;
}

// Write contents back to file
const newFileContents = configStringify(firmwareConfig);

sshWriteFile("pi@raspberrypi.local", "/boot/firmware/config.txt", newFileContents, { encoding: "utf-8" });
```

config.txt after changes applied:

```ini
# For more options and information see
# http://rptl.io/configtxt
# Some settings may impact device functionality. See link above for details

# Uncomment some or all of these to enable the optional hardware interfaces
#dtparam=i2c_arm=on
#dtparam=i2s=on
#dtparam=spi=on

# Enable audio (loads snd_bcm2835)
dtparam=audio=on

# Additional overlays and parameters are documented
# /boot/firmware/overlays/README

# Automatically load overlays for detected cameras
camera_auto_detect=0

# Automatically load overlays for detected DSI displays
display_auto_detect=1

# Automatically load initramfs files, if found
auto_initramfs=1

# Enable DRM VC4 V3D driver
dtoverlay=vc4-kms-v3d
max_framebuffers=2

# Don't have the firmware create an initial video= setting in cmdline.txt.
# Use the kernel's default instead.
disable_fw_kms_setup=1

# Run in 64-bit mode
# arm_64bit=1

# Disable compensation for displays with overscan
disable_overscan=1

# Run as fast as firmware / board allows
arm_boost=1

[cm4]
# Enable host mode on the 2711 built-in XHCI USB controller.
# (e.g. for USB device mode) or if USB support is not required.
otg_mode=1

[cm5]
dtoverlay=dwc2,dr_mode=host

[all]
# Enable PCI Express 3
dtparam=pciex1_gen=3
```

### Modifying /boot/firmware/cmdline.txt

Coming soon.

## API

### ConfigParse

Parse a config file.

```typescript
import { configParse } from "rpi-firmware-tools";

const config = configParse(`<config file contents`);
```

### ConfigStringify

Stringify a config object.

```typescript
import { configStringify } from 'rpi-firmware-tools';

const fileContents = configStringify(<config object>);
```
