import numpy as np
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties
import networkx as nx
from matplotlib.cm import ScalarMappable
from matplotlib.colors import Normalize
from mpl_toolkits.axes_grid1 import make_axes_locatable



import torch
import torch.nn.functional as F
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.font_manager import FontProperties

def plot_test_attention_heatmap(
    model_class,
    config: dict,
    station_names: list[str],
    test_loader,
    checkpoint_path: str,
    font_path: str,
    figsize: tuple[int, int] = (10, 8),
    device: torch.device | str | None = None
) -> plt.Figure:
    """
    Load a trained model, compute the mean adaptive attention matrix on the test set,
    and plot it as a heatmap with Thai labels.

    Parameters
    ----------
    model_class
        The ASTGCN_V2 (or similar) class to instantiate.
    config : dict
        Keyword args for the model __init__, e.g. hidden sizes, horizon, etc.
    station_names : list[str]
        Ordered list of your N station keys.
    test_loader : DataLoader
        Yields (Xb, yb) batches; Xb of shape [B, N, len_input].
    checkpoint_path : str
        Path to your saved weights file (e.g. "best_model.pt").
    font_path : str
        Path to a .ttf font file for plotting Thai (e.g. "Prompt_Font/Prompt-Regular.ttf").
    figsize : (width, height)
        Figure size in inches.
    device : torch.device or str, optional
        e.g. "cuda" or "cpu". If None, auto‑selects GPU if available.

    Returns
    -------
    fig : matplotlib.figure.Figure
        The figure containing your heatmap.
    """
    # 1. Device & model
    device = (
        torch.device(device)
        if isinstance(device, (str, torch.device))
        else torch.device("cuda" if torch.cuda.is_available() else "cpu")
    )
    model = model_class(num_nodes=len(station_names), **config).to(device)
    model.load_state_dict(torch.load(checkpoint_path, map_location=device))
    model.eval()

    # 2. Collect adaptive‐adjacency (attention) matrices
    attn_list = []
    with torch.no_grad():
        for Xb, _ in test_loader:
            Xb = Xb.unsqueeze(2).to(device)  # [B, N, 1, len_input]
            # compute adjacency from node embeddings
            A_int = F.relu(model.node_emb1 @ model.node_emb2)  # (N, N)
            A_adp = F.softmax(A_int, dim=1)                    # (N, N)
            attn_list.append(A_adp.cpu().numpy())

    # 3. Average over batches
    mean_attention = np.mean(np.stack(attn_list, axis=0), axis=0)

    # 4. Plot heatmap
    fp = FontProperties(fname=font_path, size=12)
    fig, ax = plt.subplots(figsize=figsize)
    im = ax.imshow(mean_attention, aspect='auto')
    ax.set_xticks(np.arange(len(station_names)))
    ax.set_yticks(np.arange(len(station_names)))
    ax.set_xticklabels(station_names, fontproperties=fp, rotation=90)
    ax.set_yticklabels(station_names, fontproperties=fp)
    ax.set_title("Average Adaptive Attention Matrix (Test Set)", fontproperties=fp)
    fig.colorbar(im, ax=ax)
    plt.tight_layout()
    plt.show()

    return fig, mean_attention






def plot_spatial_attention_graph(
    mean_attention: np.ndarray,
    station_names: list[str],
    locations: dict[str, tuple[float, float]],
    station_weights: dict[str, float],
    font_path: str,
    threshold: float | None = None,
    threshold_percentile: float = 70,
    figsize: tuple[int, int] = (20,20),
    node_size_range: tuple[float, float] = (1000, 1800),
    edge_width_range: tuple[float, float] = (1, 7),
) -> plt.Figure:
    """
    Plots a directed spatial attention graph.

    Parameters
    ----------
    mean_attention : (N,N) array
        Attention weights from station i to j.
    station_names : list of str, length N
        The names/keys for each station in `locations` and `station_weights`.
    locations : dict[str, (lat, lon)]
        Geographic coordinates for each station.
    station_weights : dict[str, float]
        A scalar importance for each station.
    font_path : str
        Path to a .ttf font file (e.g. for Thai text).
    threshold : float, optional
        Only draw edges with weight >= this. If None, computed from percentile.
    threshold_percentile : float
        Percentile at which to cut if `threshold` is None.
    figsize : (width, height)
        Size of the figure in inches.
    node_size_range : (min, max)
        Size range for nodes (mapped from station_weights).
    edge_width_range : (min, max)
        Width range for edges (mapped from their weights).

    Returns
    -------
    fig : matplotlib.figure.Figure
        The figure object (with axes already drawn).
    """
    # 1. Compute threshold
    if threshold is None:
        threshold = np.percentile(mean_attention, threshold_percentile)

    # 2. Build graph
    G = nx.DiGraph()
    for name in station_names:
        G.add_node(name)
    for i, u in enumerate(station_names):
        for j, v in enumerate(station_names):
            w = mean_attention[i, j]
            if w >= threshold:
                G.add_edge(u, v, weight=w)

    # 3. Prepare positions (lon, lat)
    pos = {n: (locations[n][1], locations[n][0]) for n in station_names}
    xs, ys = zip(*pos.values())
    x_margin = (max(xs) - min(xs)) * 0.1
    y_margin = (max(ys) - min(ys)) * 0.1

    # 4. Map edge weights → widths
    edge_ws = np.array([d["weight"] for *_, d in G.edges(data=True)])
    if edge_ws.size > 0:
        ew_min, ew_max = edge_ws.min(), edge_ws.max()
        ew_norm = (edge_ws - ew_min) / (ew_max - ew_min)
        edge_widths = edge_width_range[0] + ew_norm * (edge_width_range[1] - edge_width_range[0])
    else:
        edge_widths = []

    # 5. Map node weights → sizes & colors
    vals = np.array([station_weights[n] for n in station_names])
    nv_min, nv_max = vals.min(), vals.max()
    nv_norm = (vals - nv_min) / (nv_max - nv_min) if nv_max > nv_min else np.zeros_like(vals)
    node_sizes = node_size_range[0] + nv_norm * (node_size_range[1] - node_size_range[0])
    node_cmap = plt.cm.coolwarm

    # 6. Load font
    fp = FontProperties(fname=font_path, size=5)

    # 7. Create figure & axes
    fig, ax = plt.subplots(figsize=figsize, constrained_layout=True)
    ax.set_aspect('equal', 'box')
    ax.set_xlim(min(xs) - x_margin, max(xs) + x_margin)
    ax.set_ylim(min(ys) - y_margin, max(ys) + y_margin)
    ax.spines[:].set_visible(True)
    ax.xaxis.set_visible(True)
    ax.yaxis.set_visible(True)
    ax.tick_params(axis='both', labelsize=12)

    # 8. Draw nodes
    nx.draw_networkx_nodes(
        G, pos,
        node_size=node_sizes,
        node_color=nv_norm,
        cmap=node_cmap,
        ax=ax,
        alpha=0.9
    )

    # 9. Draw edges
    nx.draw_networkx_edges(
        G, pos,
        ax=ax,
        arrows=True,
        arrowstyle="-|>",
        arrowsize=20,
        width=edge_widths,
        edge_color=edge_ws,
        edge_cmap=plt.cm.viridis,
        connectionstyle="arc3,rad=0.2",
        alpha=0.8
    )

    # 10. Add labels
    for n, (x, y) in pos.items():
        ax.text(
            x, y, n,
            fontproperties=fp, fontsize=14,
            ha='center', va='center'
        )

    # 11. Colorbars
    divider = make_axes_locatable(ax)

    # Edge colorbar
    cax1 = divider.append_axes("right", size="4%", pad=0.1)
    edge_sm = ScalarMappable(
        norm=Normalize(vmin=edge_ws.min() if edge_ws.size else 0,
                       vmax=edge_ws.max() if edge_ws.size else 1),
        cmap=plt.cm.viridis
    )
    edge_sm.set_array([])
    cbar1 = fig.colorbar(edge_sm, cax=cax1)
    cbar1.ax.yaxis.set_label_position('left')
    cbar1.ax.set_ylabel('A→B attention', fontproperties=fp,
                        fontsize=12, labelpad=-50, va='center')
    cbar1.ax.tick_params(labelsize=10)

    # Node colorbar
    cax2 = divider.append_axes("right", size="4%", pad=0.5)
    node_sm = ScalarMappable(norm=Normalize(vmin=nv_min, vmax=nv_max), cmap=node_cmap)
    node_sm.set_array([])
    cbar2 = fig.colorbar(node_sm, cax=cax2)
    cbar2.ax.yaxis.set_label_position('left')
    cbar2.ax.set_ylabel('Station importance', fontproperties=fp,
                        fontsize=12, labelpad=-50, va='center')
    cbar2.ax.tick_params(labelsize=10)

    # Titles & annotations
    ax.set_title("Directed Graph Attention over Spatial Locations")
    ax.annotate(
        'Arrow A → B: learned attention from A (tail) to B (head)',
        xy=(0.5, -0.03), xycoords='axes fraction',
        ha='center', fontproperties=fp, fontsize=12
    )
    ax.set_xlabel("Longitude", fontproperties=fp, fontsize=14)
    ax.set_ylabel("Latitude",  fontproperties=fp, fontsize=14)
    plt.show()

    return fig