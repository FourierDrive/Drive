# Flash Operations

## Read Operations

The read operation facilitates the retrieval of data from the storage array. The device supports a power-on read function, which automatically loads the 1st page of the 1st block into the cache upon power-up, allowing immediate host access. For other data, a specific read sequence is required to transfer data from the array to the cache before extraction.

* **Page Read (13h)**: The driver issues the 13h command followed by a 24-bit address (including dummy, block, and page address) to initiate the transfer of the target page from the storage array to the internal cache register. The device enters a busy state for a duration of tRD or tRD_ECC (typically ranging from 20μs to 120μs).

* **Status Monitoring (0Fh)**: During the busy period following the Page Read command, the driver may issue the Get Feature command to poll the operation status, ensuring the transfer is complete before attempting to fetch data.

* **Read From Cache (03h/0Bh/3Bh/BBh/6Bh/EBh/EEh)**: Once the read operation is complete, the driver issues a read-from-cache command (supporting standard, x2, or x4 modes) using the column address to shift the desired bytes from the internal cache register across the serial bus into host RAM. Note that Read From Cache x4 (6Bh/EBh/EEh) is only available if Quad Enable (QE) bit in the Status Register is enabled. When user read to the end of 64-byte spare area, it won’t wrap around from the beginning boundary and an additional 64-byte ECC code will be read if internal ECC enabled.

## Program Operations

The page program operation sequence programs data into a page, ranging from a single byte up to a full page. The process relies on sequential addressing within a block and requires specific command ordering to ensure data is correctly committed to the storage cells.

* **Program Data Load (02h/32h)**: Issues the command followed by 4 dummy bits and a 12-bit column address, then streams data bytes into the full-page-length data buffer. This sequence concludes when CS# transitions from LOW to HIGH. If data exceeds the page length, additional bytes are ignored. Note that Program Load x4 (32h) is only available if Quad Enable (QE) bit in the Status Register is enabled. This command resets any unused data bytes in the data buffer to 0xFF.

* **Write Enable (06h)**: This command must be executed after the data is loaded but prior to the Program Execute command. It sets the internal Write Enable Latch (WEL) bit, which is a mandatory prerequisite for any memory modification, without it, the hardware ignores the subsequent program sequence.

* **Program Execute (10h)**: Commits the buffer content to the specified physical page. The operation is initiated by driving CS# low, shifting the 10h opcode followed by 8 dummy clocks and the 16-bit page address. Once CS# goes high, a self-timed cycle begins with a duration of tPROG or tPROG_ECC (typically ranging from 200μs to 700μs). Following this command, the data in the data buffer is no longer valid, and the WEL bit is automatically cleared. This operation requires sequential page programming within a block, and is prohibited if the page is protected or if the page has already been partially programmed.

* **Status Monitoring (0Fh)**: Issues the Get Features command to read the status register, allowing the driver to verify the outcome of the operation and ensure the programming cycle finished successfully.

* **Random Program Data Load (84h/34h)**: Performs the same data loading function as the standard load command but updates only the specific bytes provided in the input sequence. The rest of the data buffer remains unchanged, allowing for partial page updates. This command is also used during internal data move operations, after reading the source page content into the cache register via a Page Read (13h) command, one or more Random Program Data Load commands can be issued to modify specific bytes before committing the final data with the Write Enable (06h) and Program Execute (10h) sequence.

## Erase Operations

The block erasure process is the prerequisite for any write operation, resetting a physical block to its initial state to ensure that subsequent programming can occur correctly.

* **Write Enable (06h)**: Issues the command to set the internal Write Enable Latch (WEL) bit, which is required to authorize any subsequent memory modification, if the Write Enable command is not issued, then the rest of the erase sequence is ignored.

* **Block Erase (D8h)**: Transmits the erase command followed by 8 dummy clocks and the 16-bit page address to identify the specific block to be cleared.

* **Timing and Erase-Verify**: Once the page address is registered, the internal control logic automatically manages the erase timing and verify operations without further host intervention. The typical Block Erase Time (tBERS) ranges from 2ms to 10ms depending on the specific NAND flash architecture.

* **Status Monitoring (0Fh)**: Issues the Get Features command to read the status register, allowing the driver to monitor the device busy state for the duration of the tBERS cycle.
