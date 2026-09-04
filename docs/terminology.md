# Flash Terminology

* **NOR Flash**: Characterized by parallel cell connections. It behaves like standard ROM, allowing byte-addressable random reads with zero latency. This unique property enables eXecute In Place (XIP), which allows the MCU to run firmware code directly from the Flash without copying it to RAM first.

* **NAND Flash**: Characterized by series cell connections. It trades off random access capabilities for massive storage density. It cannot perform byte-addressable reads or support XIP, instead, it operates strictly as a page-addressable block device, requiring data to be copied into RAM before execution.

* **Page**: The smallest discrete unit for program operations. This is the basic grid allocation where data can be written or loaded into the internal data buffer or cache. Common hardware page boundaries range from 256 bytes in standard NOR flash to 2KB/4KB in advanced NAND flash.

* **Sector**: The typical minimal boundary for erasure in NOR structures. This is an intermediate hierarchical grouping consisting of multiple pages (e.g., 16 pages forming a 4KB sector). In typical SPI NOR architectures, this represents the minimum block size that can be electrically erased back to an all-0xFF state.

* **Block**: The largest local architectural organization and NAND erasure unit. This consists of multiple pages or sectors (e.g., 64KB in NOR or up to 512KB in NAND). For NAND flash chips, this is the strict physical boundary for erasure operations, as the intermediate sector layer is omitted.

* **Plane**: Independent parallel processing sub-arrays inside flash memory. This is a high-performance architectural zone containing its own row decoders and dedicated data buffers. Multi-plane flash layouts allow dual-channel interleaved operations to double execution throughput.

* **Data Buffer or Cache**: Volatile SRAM cache residing directly on the flash chip. This is the static memory workbench physically located on the external storage silicon. It temporarily buffers page-sized data during random load programs or page reads before data is committed to the physical floating-gate cells.

* **Out-of-Band (OOB) or Spare Area**: A dedicated metadata storage region physically associated with every page in a NAND flash array. It typically provides 16 to 128 bytes per page for system-level information, such as ECC syndrome bits, logical-to-physical block mapping, and factory-set bad block markers (BBMs). This region is accessed by extending the column address beyond the main page boundary.

* **Row Address or Page Address**: The high-level addressing component used to select a specific block and page within the memory array. In NAND architecture, the row address initiates the internal hardware process of sensing and transferring a complete page of data from the storage cells into the data buffer.

* **Column Address**: The low-level addressing component used to determine the specific byte or word offset within a selected page. It functions as a pointer within the data buffer, allowing the controller to perform partial reads or write updates to specific locations of the page currently residing in the cache.
