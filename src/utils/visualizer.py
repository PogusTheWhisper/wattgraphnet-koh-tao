# visualizer.py
import folium
from folium import plugins
import networkx as nx


def create_graph_map(
    locations: dict,
    station_weights: list,
    G: nx.Graph,
    enable_satellite: bool = True,
    zoom_start: int = 15
) -> folium.Map:
    """
    Build a Folium map with switchable 'Streets' and 'Satellite' layers,
    overlaying your graph (nodes + weighted edges).

    Args:
      - locations: {station_name: (lat, lon)}
      - station_weights: list of node weights in same order as station_names
      - G: NetworkX graph with edge attribute 'weight'
      - enable_satellite: show satellite by default if True
      - zoom_start: initial map zoom level

    Returns:
      - folium.Map instance
    """
    # Center on average coordinates
    avg_lat = sum(lat for lat, lon in locations.values()) / len(locations)
    avg_lon = sum(lon for lat, lon in locations.values()) / len(locations)

    # Initialize map without default tiles
    m = folium.Map(location=[avg_lat, avg_lon], zoom_start=zoom_start, tiles=None)

    # Add street and satellite layers
    folium.TileLayer('OpenStreetMap', name='Streets', show=not enable_satellite).add_to(m)
    folium.TileLayer('Esri.WorldImagery', name='Satellite', show=enable_satellite).add_to(m)

    # Draw nodes
    station_names = list(locations.keys())
    max_w = max(station_weights)
    for idx, name in enumerate(station_names):
        lat, lon = locations[name]
        w = station_weights[idx]
        folium.CircleMarker(
            location=[lat, lon],
            radius=5 + 5 * (w / max_w),
            color='yellow',
            fill=True,
            fill_opacity=0.7,
            popup=f"{name}\nW={w:.2f}"  
        ).add_to(m)

    # Draw edges
    max_ew = max(d['weight'] for _, _, d in G.edges(data=True))
    for u, v, d in G.edges(data=True):
        coord_u = locations[station_names[u]]
        coord_v = locations[station_names[v]]
        w = d['weight']
        folium.PolyLine(
            locations=[coord_u, coord_v],
            weight=1 + 4 * (w / max_ew),
            color='red',
            opacity=0.6,
            popup=f"{station_names[u]} ↔ {station_names[v]}: {w:.2f}"
        ).add_to(m)

    # MiniMap and layer control
    plugins.MiniMap(toggle_display=True).add_to(m)
    folium.LayerControl(collapsed=False, position='topright').add_to(m)

    return m




def plot_static_graph(
    G: nx.Graph,
    pos: dict,
    station_names: list,
    station_weights: list,
    locations: dict,
    thai_font,
    figsize: tuple = (8, 8)
):
    """
    Plot a static graph with nodes, weighted edges, and annotations (name, weight, coords).
    """
    import numpy as np
    import matplotlib.pyplot as plt

    ei = nx.to_numpy_array(G, weight=None)  # adjacency for indices
    ew = [d['weight'] for _,_,d in G.edges(data=True)]

    fig, ax = plt.subplots(figsize=figsize)
    nx.draw_networkx_nodes(G, pos, node_size=300, ax=ax)
    nx.draw_networkx_edges(
        G, pos,
        width=[0.5 + 2*(w / max(ew)) for w in ew],
        alpha=0.7,
        ax=ax
    )

    # Node annotations
    for idx, (x, y) in pos.items():
        name = station_names[idx]
        w = station_weights[idx]
        lat, lon = locations[name]
        ax.text(
            x, y,
            f"{name}\nW={w:.2f}\n({lat:.4f},{lon:.4f})",
            fontproperties=thai_font,
            ha='center', va='center',
            fontsize=8,
            bbox=dict(facecolor='white', alpha=0.6, boxstyle='round,pad=0.2')
        )

    # Edge weight annotations
    for u, v, d in G.edges(data=True):
        x_u, y_u = pos[u]
        x_v, y_v = pos[v]
        x_mid = (x_u + x_v) / 2
        y_mid = (y_u + y_v) / 2
        w = d['weight']
        ax.text(
            x_mid, y_mid,
            f"{w:.2f}",
            fontproperties=thai_font,
            fontsize=6,
            ha='center', va='center',
            color='red',
            bbox=dict(facecolor='white', alpha=0.5, pad=0.1)
        )

    ax.set_title('โครงสร้างกราฟพร้อมน้ำหนักขอบ', fontproperties=thai_font, size=14)
    ax.axis('off')
    plt.show()
