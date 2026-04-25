import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_map_tile_caching/flutter_map_tile_caching.dart';
import 'package:latlong2/latlong.dart';

class MapPlanningScreen extends StatefulWidget {
  const MapPlanningScreen({super.key});

  @override
  State<MapPlanningScreen> createState() => _MapPlanningScreenState();
}

class _MapPlanningScreenState extends State<MapPlanningScreen> {
  final _mapController = MapController();
  final _store = const FMTCStore('BioFieldCache');
  late final _tileProvider = FMTCTileProvider.allStores(
    allStoresStrategy: BrowseStoreStrategy.readUpdateCreate,
    loadingStrategy: BrowseLoadingStrategy.cacheFirst,
  );
  
  bool _isDownloading = false;
  double _progress = 0.0;
  String _status = 'Listo para descargar';

  Future<void> _startDownload() async {
    setState(() {
      _isDownloading = true;
      _progress = 0.0;
      _status = 'Calculando teselas...';
    });

    try {
      final region = _mapController.camera.visibleBounds;
      final downloadableRegion = RectangleRegion(region).toDownloadable(
        minZoom: 1,
        maxZoom: 18,
        options: TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'es.guibas.biofield',
        ),
      );

      final (:downloadProgress, tileEvents: _) = _store.download.startForeground(
        region: downloadableRegion,
      );

      downloadProgress.listen((event) {
        if (mounted) {
          setState(() {
            _progress = event.percentageProgress / 100;
            _status = 'Descargando: ${event.attemptedTilesCount} / ${event.maxTilesCount}';
          });
        }
      }, onDone: () {
        if (mounted) {
          setState(() {
            _isDownloading = false;
            _status = '¡Descarga completada!';
          });
        }
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _isDownloading = false;
          _status = 'Error: $e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Descargar Mapas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_sweep),
            onPressed: () async {
              await _store.manage.reset();
              if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Caché limpiada')));
            },
          )
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Text(_status, style: const TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    LinearProgressIndicator(value: _isDownloading ? _progress : 0),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: Stack(
              children: [
                FlutterMap(
                  mapController: _mapController,
                  options: const MapOptions(
                    initialCenter: LatLng(40.4168, -3.7038),
                    initialZoom: 13,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'es.guibas.biofield',
                      tileProvider: _tileProvider,
                    ),
                  ],
                ),
                Center(
                  child: Container(
                    width: 250,
                    height: 250,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.blue, width: 2),
                      color: Colors.blue.withOpacity(0.1),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _isDownloading ? null : _startDownload,
        label: const Text('Descargar zona'),
        icon: const Icon(Icons.download),
      ),
    );
  }
}
