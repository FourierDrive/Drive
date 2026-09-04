# Flash

## Flash Terminology

* NOR Flash: Characterized by parallel cell connections. It behaves like standard ROM, allowing byte-addressable random reads with zero latency. This unique property enables eXecute In Place (XIP), which allows the MCU to run firmware code directly from the Flash without copying it to RAM first.

* NAND Flash: Characterized by series cell connections. It trades off random access capabilities for massive storage density. It cannot perform byte-addressable reads or support XIP, instead, it operates strictly as a page-addressable block device, requiring data to be copied into RAM before execution.

* Page: The smallest discrete unit for program operations. This is the basic grid allocation where data can be written or loaded into the internal data buffer or cache. Common hardware page boundaries range from 256 bytes in standard NOR flash to 2KB/4KB in advanced NAND flash.

* Sector: The typical minimal boundary for erasure in NOR structures. This is an intermediate hierarchical grouping consisting of multiple pages (e.g., 16 pages forming a 4KB sector). In typical SPI NOR architectures, this represents the minimum block size that can be electrically erased back to an all-0xFF state.

* Block: The largest local architectural organization and NAND erasure unit. This consists of multiple pages or sectors (e.g., 64KB in NOR or up to 512KB in NAND). For NAND flash chips, this is the strict physical boundary for erasure operations, as the intermediate sector layer is omitted.

* Plane: Independent parallel processing sub-arrays inside flash memory. This is a high-performance architectural zone containing its own row decoders and dedicated data buffers. Multi-plane flash layouts allow dual-channel interleaved operations to double execution throughput.

* Data Buffer or Cache: Volatile SRAM cache residing directly on the flash chip. This is the static memory workbench physically located on the external storage silicon. It temporarily buffers page-sized data during random load programs or page reads before data is committed to the physical floating-gate cells.

* Out-of-Band (OOB) or Spare Area: A dedicated metadata storage region physically associated with every page in a NAND flash array. It typically provides 16 to 128 bytes per page for system-level information, such as ECC syndrome bits, logical-to-physical block mapping, and factory-set bad block markers (BBMs). This region is accessed by extending the column address beyond the main page boundary.

* Row Address or Page Address: The high-level addressing component used to select a specific block and page within the memory array. In NAND architecture, the row address initiates the internal hardware process of sensing and transferring a complete page of data from the storage cells into the data buffer.

* Column Address: The low-level addressing component used to determine the specific byte or word offset within a selected page. It functions as a pointer within the data buffer, allowing the controller to perform partial reads or write updates to specific locations of the page currently residing in the cache.

## Controller Interface

The Flash Controller IP represents the internal MCU peripheral logic responsible for translating host register commands into raw physical pin signaling across the SPI/QSPI bus.

* Command Dispatch: Initiating hardware tasks via control registers. The processor configures the internal IP controller registers to orchestrate SPI timing sequences, sending specific hardware command codes (such as 02h for Page Program or 0Fh for Get Feature) directly to the external chip.

* Hardware Busy State: Microscopic blocking on the internal peripheral bus. The controller register tracks the active transmission status of the physical serial lines via internal flags. The processor must block or wait until the controller finishes pumping serial bits down the wire.

* Operation In Progress (OIP): Macroscopic tracking of external silicon execution. While the controller IP becomes free quickly after delivering a command, the external flash chip remains busy for milliseconds executing high-voltage physical erasure or program execution. The software must poll the OIP bit in the external chip status register.

* TX/RX FIFO Management: Buffer-based serial data flow. The controller utilizes internal hardware FIFOs (First-In, First-Out) to decouple the processor from the serial clock domain. Data to be programmed is written into the TX FIFO, while incoming read data is captured in the RX FIFO. The driver must monitor FIFO status flags (e.g., threshold, empty, or full) to prevent underflow or overflow during high-speed burst transfers.

* SPI/QSPI Modes: Bus protocol configuration. The controller supports different communication modes defined by the Clock Polarity (CPOL) and Clock Phase (CPHA) settings, which dictate the timing relationship between the clock and data edges. Note that SPI NAND devices typically support only two modes: Mode 0 (CPOL=0, CPHA=0) and Mode 3 (CPOL=1, CPHA=1). Furthermore, the interface can be configured for Single, Dual, or Quad I/O modes, enabling the controller to utilize multiple data pins (IO0-IO3) concurrently to significantly increase data throughput during high-speed page read and load operations.

## Read Operations

The read operation facilitates the retrieval of data from the storage array. The device supports a power-on read function, which automatically loads the 1st page of the 1st block into the cache upon power-up, allowing immediate host access. For other data, a specific read sequence is required to transfer data from the array to the cache before extraction.

* Page Read (13h): The driver issues the 13h command followed by a 24-bit address (including dummy, block, and page address) to initiate the transfer of the target page from the storage array to the internal cache register. The device enters a busy state for a duration of tRD or tRD_ECC (typically ranging from 20μs to 120μs).

* Status Monitoring (0Fh): During the busy period following the Page Read command, the driver may issue the Get Feature command to poll the operation status, ensuring the transfer is complete before attempting to fetch data.

* Read From Cache (03h/0Bh/3Bh/BBh/6Bh/EBh/EEh): Once the read operation is complete, the driver issues a read-from-cache command (supporting standard, x2, or x4 modes) using the column address to shift the desired bytes from the internal cache register across the serial bus into host RAM. Note that Read From Cache x4 (6Bh/EBh/EEh) is only available if Quad Enable (QE) bit in the Status Register is enabled. When user read to the end of 64-byte spare area, it won’t wrap around from the beginning boundary and an additional 64-byte ECC code will be read if internal ECC enabled.

## Program Operations

The page program operation sequence programs data into a page, ranging from a single byte up to a full page. The process relies on sequential addressing within a block and requires specific command ordering to ensure data is correctly committed to the storage cells.

* Program Data Load (02h/32h): Issues the command followed by 4 dummy bits and a 12-bit column address, then streams data bytes into the full-page-length data buffer. This sequence concludes when CS# transitions from LOW to HIGH. If data exceeds the page length, additional bytes are ignored. Note that Program Load x4 (32h) is only available if Quad Enable (QE) bit in the Status Register is enabled. This command resets any unused data bytes in the data buffer to 0xFF.

* Write Enable (06h): This command must be executed after the data is loaded but prior to the Program Execute command. It sets the internal Write Enable Latch (WEL) bit, which is a mandatory prerequisite for any memory modification, without it, the hardware ignores the subsequent program sequence.

* Program Execute (10h): Commits the buffer content to the specified physical page. The operation is initiated by driving CS# low, shifting the 10h opcode followed by 8 dummy clocks and the 16-bit page address. Once CS# goes high, a self-timed cycle begins with a duration of tPROG or tPROG_ECC (typically ranging from 200μs to 700μs). Following this command, the data in the data buffer is no longer valid, and the WEL bit is automatically cleared. This operation requires sequential page programming within a block, and is prohibited if the page is protected or if the page has already been partially programmed.

* Status Monitoring (0Fh): Issues the Get Features command to read the status register, allowing the driver to verify the outcome of the operation and ensure the programming cycle finished successfully.

* Random Program Data Load (84h/34h): Performs the same data loading function as the standard load command but updates only the specific bytes provided in the input sequence. The rest of the data buffer remains unchanged, allowing for partial page updates. This command is also used during internal data move operations, after reading the source page content into the cache register via a Page Read (13h) command, one or more Random Program Data Load commands can be issued to modify specific bytes before committing the final data with the Write Enable (06h) and Program Execute (10h) sequence.

## Erase Operations

The block erasure process is the prerequisite for any write operation, resetting a physical block to its initial state to ensure that subsequent programming can occur correctly.

* Write Enable (06h): Issues the command to set the internal Write Enable Latch (WEL) bit, which is required to authorize any subsequent memory modification, if the Write Enable command is not issued, then the rest of the erase sequence is ignored.

* Block Erase (D8h): Transmits the erase command followed by 8 dummy clocks and the 16-bit page address to identify the specific block to be cleared.

* Timing and Erase-Verify: Once the page address is registered, the internal control logic automatically manages the erase timing and verify operations without further host intervention. The typical Block Erase Time (tBERS) ranges from 2ms to 10ms depending on the specific NAND flash architecture.

* Status Monitoring (0Fh): Issues the Get Features command to read the status register, allowing the driver to monitor the device busy state for the duration of the tBERS cycle.

## Suspend and Resume

Hardware-level interruptibility. To solve non-concurrent deadlock and maintain real-time responsiveness, modern flash devices support interruptible command states.

* Suspend Operation: When an urgent read request occurs during an ongoing erase or program cycle, the driver issues a suspend command to freeze the internal charge pumps and state machine. Once the status register flags the suspension as successful, the device is ready for high-priority access.

* Execution During Suspension: With the device suspended, the driver can safely perform high-priority read operations or allow the processor to fetch XIP code from the flash array.

* Resume Operation: After critical tasks conclude, the driver issues a resume command. This restarts the internal state machine, allowing the original erase or program cycle to finish from its point of interruption. Drivers must verify that the device has cleared its busy state before triggering this sequence.

## Bad Block Management

Inherent manufacturing and operational degradation. NOR Flash arrays ship from the factory perfectly clean and rarely develop bad blocks during their lifespan. Conversely, NAND Flash chips ship with factory bad blocks due to cost-driven yield allowances and develop new bad blocks dynamically under continuous wear, requiring active Flash Translation Layer (FTL) software management to map logical addresses to healthy physical sectors.

* Bit-Flip Susceptibility: Noise and charge leakage leading to data corruption. NOR Flash features high reliability and low error rates, requiring minimal or no software error handling. NAND Flash is highly susceptible to read/write disturb noise and charge leakage, forcing every page access to be coupled with hardware-based ECC logic (such as BCH or LDPC) to detect and correct bit-flips in real-time.

* Wear Leveling: NAND Flash cells have a finite endurance cycle, typically ranging from 1,000 to 100,000 cycles depending on the cell type. FTL software must implement wear leveling algorithms—distributing write/erase operations evenly across all physical blocks—to prevent premature device failure caused by concentrating updates on specific logical address ranges.

* Factory Defect Mapping: During device initialization, the driver must scan the factory-defined bad block markers, typically located in the spare area of the first or last page of a block. These identified blocks are flagged in a Bad Block Table (BBT) and permanently excluded from the file system's usable memory space to prevent data loss.
